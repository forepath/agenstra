import { Body, Controller, Get, Post, Res, UseGuards } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from '@forepath/identity/backend';
import type { Response } from 'express';
import { OpenAiAgentCtx } from '../../auth/openai-agent-context.decorator';
import type { OpenAiAgentContext } from '../../auth/openai-agent.types';
import { OpenAiApiKeyGuard } from '../../auth/openai-api-key.guard';
import {
  parseChatCompletionsBody,
  parseCompletionsBody,
  parseResponsesBody,
} from '../../dto/openai/openai-body.validation';
import {
  formatChatMessagesForAgent,
  normalizeOpenAiPrompt,
  normalizeResponsesInput,
} from '../../services/openai/openai-prompt.utils';
import {
  buildChatCompletion,
  buildChatCompletionChunk,
  buildModelsList,
  buildResponsesObject,
  buildResponsesStreamChunk,
  buildTextCompletion,
  buildTextCompletionChunk,
  newOpenAiId,
  openAiUnixTimestamp,
} from '../../services/openai/openai-response-shapes';
import { OpenAiAgentWsProxyService } from '../../services/openai/openai-agent-ws-proxy.service';
import { ClientAgentProxyService } from '../../services/client-agent-proxy.service';

/**
 * OpenAI API v1-compatible surface. Authenticated via per-agent key (`Authorization: Bearer <key>`).
 * Platform JWT / static API key auth is bypassed via `@Public()`; {@link OpenAiApiKeyGuard} enforces agent keys.
 */
@Public()
@SkipThrottle()
@Controller('openai')
@UseGuards(OpenAiApiKeyGuard)
export class OpenAiV1Controller {
  constructor(
    private readonly clientAgentProxyService: ClientAgentProxyService,
    private readonly openAiAgentWsProxy: OpenAiAgentWsProxyService,
  ) {}

  @Get('v1/models')
  async listModels(@OpenAiAgentCtx() ctx: OpenAiAgentContext): Promise<Record<string, unknown>> {
    const modelsMap = await this.clientAgentProxyService.listClientAgentModels(ctx.clientId, ctx.agentId);
    const modelIds = Object.keys(modelsMap);
    if (modelIds.length === 0) {
      return buildModelsList({ modelIds: ['default'] });
    }
    return buildModelsList({ modelIds });
  }

  @Post('v1/chat/completions')
  async chatCompletions(
    @OpenAiAgentCtx() ctx: OpenAiAgentContext,
    @Body() body: unknown,
    @Res() res: Response,
  ): Promise<void> {
    const parsed = parseChatCompletionsBody(body);
    const userText = formatChatMessagesForAgent(parsed.messages);
    const correlationId = OpenAiAgentWsProxyService.newCorrelationId();

    if (parsed.stream) {
      res.status(200);
      res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      const id = newOpenAiId('chatcmpl');
      const created = openAiUnixTimestamp();
      try {
        res.write(
          `data: ${JSON.stringify(
            buildChatCompletionChunk({
              id,
              created,
              model: parsed.model,
              delta: { role: 'assistant' },
            }),
          )}\n\n`,
        );
        for await (const delta of this.openAiAgentWsProxy.completeStream({
          clientId: ctx.clientId,
          agentId: ctx.agentId,
          userText,
          model: parsed.model,
          correlationId,
        })) {
          if (delta) {
            res.write(
              `data: ${JSON.stringify(
                buildChatCompletionChunk({
                  id,
                  created,
                  model: parsed.model,
                  delta: { content: delta },
                }),
              )}\n\n`,
            );
          }
        }
        res.write(
          `data: ${JSON.stringify(
            buildChatCompletionChunk({
              id,
              created,
              model: parsed.model,
              delta: {},
              finishReason: 'stop',
            }),
          )}\n\n`,
        );
        res.write('data: [DONE]\n\n');
      } catch (e) {
        const err = e as { message?: string };
        res.write(`data: ${JSON.stringify({ error: { message: err.message || 'stream_error' } })}\n\n`);
      }
      res.end();
      return;
    }

    const text = await this.openAiAgentWsProxy.completeNonStream({
      clientId: ctx.clientId,
      agentId: ctx.agentId,
      userText,
      model: parsed.model,
      correlationId,
    });
    const id = newOpenAiId('chatcmpl');
    res.status(200).json(
      buildChatCompletion({
        id,
        created: openAiUnixTimestamp(),
        model: parsed.model,
        content: text,
      }),
    );
  }

  @Post('v1/completions')
  async completions(
    @OpenAiAgentCtx() ctx: OpenAiAgentContext,
    @Body() body: unknown,
    @Res() res: Response,
  ): Promise<void> {
    const parsed = parseCompletionsBody(body);
    const prompt = normalizeOpenAiPrompt(parsed.prompt);
    const correlationId = OpenAiAgentWsProxyService.newCorrelationId();

    if (parsed.stream) {
      res.status(200);
      res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      const id = newOpenAiId('cmpl');
      const created = openAiUnixTimestamp();
      try {
        for await (const delta of this.openAiAgentWsProxy.completeStream({
          clientId: ctx.clientId,
          agentId: ctx.agentId,
          userText: prompt,
          model: parsed.model,
          correlationId,
        })) {
          if (delta) {
            res.write(
              `data: ${JSON.stringify(
                buildTextCompletionChunk({
                  id,
                  created,
                  model: parsed.model,
                  text: delta,
                }),
              )}\n\n`,
            );
          }
        }
        res.write(
          `data: ${JSON.stringify(
            buildTextCompletionChunk({
              id,
              created,
              model: parsed.model,
              text: '',
              finishReason: 'stop',
            }),
          )}\n\n`,
        );
        res.write('data: [DONE]\n\n');
      } catch (e) {
        const err = e as { message?: string };
        res.write(`data: ${JSON.stringify({ error: { message: err.message || 'stream_error' } })}\n\n`);
      }
      res.end();
      return;
    }

    const text = await this.openAiAgentWsProxy.completeNonStream({
      clientId: ctx.clientId,
      agentId: ctx.agentId,
      userText: prompt,
      model: parsed.model,
      correlationId,
    });
    const id = newOpenAiId('cmpl');
    res.status(200).json(
      buildTextCompletion({
        id,
        created: openAiUnixTimestamp(),
        model: parsed.model,
        text,
      }),
    );
  }

  @Post('v1/responses')
  async responses(
    @OpenAiAgentCtx() ctx: OpenAiAgentContext,
    @Body() body: unknown,
    @Res() res: Response,
  ): Promise<void> {
    const parsed = parseResponsesBody(body);
    const userText = normalizeResponsesInput(parsed.input);
    const correlationId = OpenAiAgentWsProxyService.newCorrelationId();
    const respId = newOpenAiId('resp');

    if (parsed.stream) {
      res.status(200);
      res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      try {
        for await (const delta of this.openAiAgentWsProxy.completeStream({
          clientId: ctx.clientId,
          agentId: ctx.agentId,
          userText,
          model: parsed.model,
          correlationId,
        })) {
          if (delta) {
            res.write(
              `data: ${JSON.stringify(
                buildResponsesStreamChunk({
                  id: respId,
                  model: parsed.model,
                  delta,
                }),
              )}\n\n`,
            );
          }
        }
        res.write('data: [DONE]\n\n');
      } catch (e) {
        const err = e as { message?: string };
        res.write(`data: ${JSON.stringify({ error: { message: err.message || 'stream_error' } })}\n\n`);
      }
      res.end();
      return;
    }

    const text = await this.openAiAgentWsProxy.completeNonStream({
      clientId: ctx.clientId,
      agentId: ctx.agentId,
      userText,
      model: parsed.model,
      correlationId,
    });
    res.status(200).json(
      buildResponsesObject({
        id: respId,
        created: openAiUnixTimestamp(),
        model: parsed.model,
        text,
      }),
    );
  }
}

import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  forwardRef,
  input,
  QueryList,
  ViewChildren,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, ReactiveFormsModule } from '@angular/forms';

const CODE_LENGTH = 6;

@Component({
  selector: 'framework-agent-console-otp-input',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './otp-input.component.html',
  styleUrls: ['./otp-input.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => OtpInputComponent),
      multi: true,
    },
  ],
})
export class OtpInputComponent implements ControlValueAccessor {
  readonly digits = Array.from({ length: CODE_LENGTH }, (_, i) => i);
  readonly invalid = input<boolean>(false);
  readonly disabled = input<boolean>(false);

  @ViewChildren('digitInput') digitInputs!: QueryList<ElementRef<HTMLInputElement>>;

  private _value = '';
  private _onChange: (value: string) => void = () => {};
  private _onTouched: () => void = () => {};

  get value(): string {
    return this._value;
  }

  writeValue(value: string): void {
    const alphanumeric = (value ?? '')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, CODE_LENGTH);
    this._value = alphanumeric;
  }

  registerOnChange(fn: (value: string) => void): void {
    this._onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this._onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    // Handled via input()
  }

  getDigit(index: number): string {
    return this._value[index] ?? '';
  }

  onInput(event: Event, index: number): void {
    const input = event.target as HTMLInputElement;
    const raw = input.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    let newValue: string;

    if (raw.length >= CODE_LENGTH) {
      newValue = raw.slice(0, CODE_LENGTH).toUpperCase();
      this._value = newValue;
      this._onChange(newValue);
      this.focusInput(CODE_LENGTH - 1);
      return;
    }

    if (raw.length === 1) {
      newValue = this._value.slice(0, index) + raw + this._value.slice(index + 1);
      this._value = newValue.slice(0, CODE_LENGTH);
      this._onChange(this._value);
      input.value = raw;
      if (index < CODE_LENGTH - 1) {
        this.focusInput(index + 1);
      }
    } else if (raw.length === 0) {
      newValue = this._value.slice(0, index) + this._value.slice(index + 1);
      this._value = newValue;
      this._onChange(this._value);
    }
  }

  onKeydown(event: KeyboardEvent, index: number): void {
    if (event.key === 'Backspace' && !this.getDigit(index) && index > 0) {
      this.focusInput(index - 1);
    } else if (event.key === 'ArrowLeft' && index > 0) {
      event.preventDefault();
      this.focusInput(index - 1);
    } else if (event.key === 'ArrowRight' && index < CODE_LENGTH - 1) {
      event.preventDefault();
      this.focusInput(index + 1);
    }
  }

  onPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const pasted = (event.clipboardData?.getData('text') ?? '')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, CODE_LENGTH);
    if (pasted.length > 0) {
      this._value = pasted.padEnd(CODE_LENGTH, '').slice(0, CODE_LENGTH);
      this._onChange(this._value);
      this.updateInputsFromValue();
      this.focusInput(Math.min(pasted.length, CODE_LENGTH) - 1);
    }
  }

  onBlur(event: FocusEvent): void {
    const container = event.currentTarget as HTMLElement;
    const relatedTarget = event.relatedTarget as HTMLElement | null;
    if (!relatedTarget || !container.contains(relatedTarget)) {
      this._onTouched();
    }
  }

  private focusInput(index: number): void {
    setTimeout(() => {
      const inputs = this.digitInputs?.toArray();
      const el = inputs?.[index]?.nativeElement;
      if (el) {
        el.focus();
      }
    }, 0);
  }

  private updateInputsFromValue(): void {
    setTimeout(() => {
      const inputs = this.digitInputs?.toArray() ?? [];
      for (let i = 0; i < inputs.length; i++) {
        const el = inputs[i]?.nativeElement;
        if (el) {
          el.value = this.getDigit(i);
        }
      }
    }, 0);
  }
}

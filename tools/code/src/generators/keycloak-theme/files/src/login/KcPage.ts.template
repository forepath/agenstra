import {
  getDefaultPageComponent,
  type KcPage,
} from '@keycloakify/angular/login';
import { UserProfileFormFieldsComponent } from './components/user-profile-form-fields/user-profile-form-fields.component';
import { TemplateComponent } from './template/template.component';
import type { ClassKey } from 'keycloakify/login';
import type { KcContext } from './KcContext';

export const classes = {} satisfies Partial<Record<ClassKey, string>>;
export const doUseDefaultCss = true;
export const doMakeUserConfirmPassword = true;

export async function getKcPage(pageId: KcContext['pageId']): Promise<KcPage> {
  switch (pageId) {
    case 'login.ftl':
      return {
        PageComponent: (await import('./pages/login/login.component'))
          .LoginComponent,
        TemplateComponent,
        UserProfileFormFieldsComponent,
        doMakeUserConfirmPassword,
        doUseDefaultCss,
        classes,
      };
    case 'login-username.ftl':
      return {
        PageComponent: (
          await import('./pages/login-username/login-username.component')
        ).LoginUsernameComponent,
        TemplateComponent,
        UserProfileFormFieldsComponent,
        doMakeUserConfirmPassword,
        doUseDefaultCss,
        classes,
      };
    case 'login-password.ftl':
      return {
        PageComponent: (
          await import('./pages/login-password/login-password.component')
        ).LoginPasswordComponent,
        TemplateComponent,
        UserProfileFormFieldsComponent,
        doMakeUserConfirmPassword,
        doUseDefaultCss,
        classes,
      };
    case 'webauthn-authenticate.ftl':
      return {
        PageComponent: (
          await import(
            './pages/webauthn-authenticate/webauthn-authenticate.component'
          )
        ).WebauthnAuthenticateComponent,
        TemplateComponent,
        UserProfileFormFieldsComponent,
        doMakeUserConfirmPassword,
        doUseDefaultCss,
        classes,
      };
    case 'webauthn-register.ftl':
      return {
        PageComponent: (
          await import('./pages/webauthn-register/webauthn-register.component')
        ).WebauthnRegisterComponent,
        TemplateComponent,
        UserProfileFormFieldsComponent,
        doMakeUserConfirmPassword,
        doUseDefaultCss,
        classes,
      };
    case 'register.ftl':
      return {
        PageComponent: (await import('./pages/register/register.component'))
          .RegisterComponent,
        TemplateComponent,
        UserProfileFormFieldsComponent,
        doMakeUserConfirmPassword,
        doUseDefaultCss,
        classes,
      };
    case 'info.ftl':
      return {
        PageComponent: (await import('./pages/info/info.component'))
          .InfoComponent,
        TemplateComponent,
        UserProfileFormFieldsComponent,
        doMakeUserConfirmPassword,
        doUseDefaultCss,
        classes,
      };
    case 'error.ftl':
      return {
        PageComponent: (await import('./pages/error/error.component'))
          .ErrorComponent,
        TemplateComponent,
        UserProfileFormFieldsComponent,
        doMakeUserConfirmPassword,
        doUseDefaultCss,
        classes,
      };
    case 'login-reset-password.ftl':
      return {
        PageComponent: (
          await import(
            './pages/login-reset-password/login-reset-password.component'
          )
        ).LoginResetPasswordComponent,
        TemplateComponent,
        UserProfileFormFieldsComponent,
        doMakeUserConfirmPassword,
        doUseDefaultCss,
        classes,
      };
    case 'login-verify-email.ftl':
      return {
        PageComponent: (
          await import(
            './pages/login-verify-email/login-verify-email.component'
          )
        ).LoginVerifyEmailComponent,
        TemplateComponent,
        UserProfileFormFieldsComponent,
        doMakeUserConfirmPassword,
        doUseDefaultCss,
        classes,
      };
    case 'terms.ftl':
      return {
        PageComponent: (await import('./pages/terms/terms.component'))
          .TermsComponent,
        TemplateComponent,
        UserProfileFormFieldsComponent,
        doMakeUserConfirmPassword,
        doUseDefaultCss,
        classes,
      };
    case 'login-oauth2-device-verify-user-code.ftl':
      return {
        PageComponent: (
          await import(
            './pages/login-oauth2-device-verify-user-code/login-oauth2-device-verify-user-code.component'
          )
        ).LoginOauth2DeviceVerifyUserCodeComponent,
        TemplateComponent,
        UserProfileFormFieldsComponent,
        doMakeUserConfirmPassword,
        doUseDefaultCss,
        classes,
      };
    case 'login-oauth-grant.ftl':
      return {
        PageComponent: (
          await import('./pages/login-oauth-grant/login-oauth-grant.component')
        ).LoginOauthGrantComponent,
        TemplateComponent,
        UserProfileFormFieldsComponent,
        doMakeUserConfirmPassword,
        doUseDefaultCss,
        classes,
      };
    case 'login-otp.ftl':
      return {
        PageComponent: (await import('./pages/login-otp/login-otp.component'))
          .LoginOtpComponent,
        TemplateComponent,
        UserProfileFormFieldsComponent,
        doMakeUserConfirmPassword,
        doUseDefaultCss,
        classes,
      };
    case 'login-update-profile.ftl':
      return {
        PageComponent: (
          await import(
            './pages/login-update-profile/login-update-profile.component'
          )
        ).LoginUpdateProfileComponent,
        TemplateComponent,
        UserProfileFormFieldsComponent,
        doMakeUserConfirmPassword,
        doUseDefaultCss,
        classes,
      };
    case 'login-update-password.ftl':
      return {
        PageComponent: (
          await import(
            './pages/login-update-password/login-update-password.component'
          )
        ).LoginUpdatePasswordComponent,
        TemplateComponent,
        UserProfileFormFieldsComponent,
        doMakeUserConfirmPassword,
        doUseDefaultCss,
        classes,
      };
    case 'login-idp-link-confirm.ftl':
      return {
        PageComponent: (
          await import(
            './pages/login-idp-link-confirm/login-idp-link-confirm.component'
          )
        ).LoginIdpLinkConfirmComponent,
        TemplateComponent,
        UserProfileFormFieldsComponent,
        doMakeUserConfirmPassword,
        doUseDefaultCss,
        classes,
      };
    case 'login-idp-link-email.ftl':
      return {
        PageComponent: (
          await import(
            './pages/login-idp-link-email/login-idp-link-email.component'
          )
        ).LoginIdpLinkEmailComponent,
        TemplateComponent,
        UserProfileFormFieldsComponent,
        doMakeUserConfirmPassword,
        doUseDefaultCss,
        classes,
      };
    case 'login-page-expired.ftl':
      return {
        PageComponent: (
          await import(
            './pages/login-page-expired/login-page-expired.component'
          )
        ).LoginPageExpiredComponent,
        TemplateComponent,
        UserProfileFormFieldsComponent,
        doMakeUserConfirmPassword,
        doUseDefaultCss,
        classes,
      };
    case 'login-config-totp.ftl':
      return {
        PageComponent: (
          await import('./pages/login-config-totp/login-config-totp.component')
        ).LoginConfigTotpComponent,
        TemplateComponent,
        UserProfileFormFieldsComponent,
        doMakeUserConfirmPassword,
        doUseDefaultCss,
        classes,
      };
    case 'logout-confirm.ftl':
      return {
        PageComponent: (
          await import('./pages/logout-confirm/logout-confirm.component')
        ).LogoutConfirmComponent,
        TemplateComponent,
        UserProfileFormFieldsComponent,
        doMakeUserConfirmPassword,
        doUseDefaultCss,
        classes,
      };
    case 'idp-review-user-profile.ftl':
      return {
        PageComponent: (
          await import(
            './pages/idp-review-user-profile/idp-review-user-profile.component'
          )
        ).IdpReviewUserProfileComponent,
        TemplateComponent,
        UserProfileFormFieldsComponent,
        doMakeUserConfirmPassword,
        doUseDefaultCss,
        classes,
      };
    case 'update-email.ftl':
      return {
        PageComponent: (
          await import('./pages/update-email/update-email.component')
        ).UpdateEmailComponent,
        TemplateComponent,
        UserProfileFormFieldsComponent,
        doMakeUserConfirmPassword,
        doUseDefaultCss,
        classes,
      };
    case 'select-authenticator.ftl':
      return {
        PageComponent: (
          await import(
            './pages/select-authenticator/select-authenticator.component'
          )
        ).SelectAuthenticatorComponent,
        TemplateComponent,
        UserProfileFormFieldsComponent,
        doMakeUserConfirmPassword,
        doUseDefaultCss,
        classes,
      };
    case 'saml-post-form.ftl':
      return {
        PageComponent: (
          await import('./pages/saml-post-form/saml-post-form.component')
        ).SamlPostFormComponent,
        TemplateComponent,
        UserProfileFormFieldsComponent,
        doMakeUserConfirmPassword,
        doUseDefaultCss,
        classes,
      };
    case 'delete-credential.ftl':
      return {
        PageComponent: (
          await import('./pages/delete-credential/delete-credential.component')
        ).DeleteCredentialComponent,
        TemplateComponent,
        UserProfileFormFieldsComponent,
        doMakeUserConfirmPassword,
        doUseDefaultCss,
        classes,
      };
    case 'code.ftl':
      return {
        PageComponent: (await import('./pages/code/code.component'))
          .CodeComponent,
        TemplateComponent,
        UserProfileFormFieldsComponent,
        doMakeUserConfirmPassword,
        doUseDefaultCss,
        classes,
      };
    case 'delete-account-confirm.ftl':
      return {
        PageComponent: (
          await import(
            './pages/delete-account-confirm/delete-account-confirm.component'
          )
        ).DeleteAccountConfirmComponent,
        TemplateComponent,
        UserProfileFormFieldsComponent,
        doMakeUserConfirmPassword,
        doUseDefaultCss,
        classes,
      };
    case 'frontchannel-logout.ftl':
      return {
        PageComponent: (
          await import(
            './pages/frontchannel-logout/frontchannel-logout.component'
          )
        ).FrontchannelLogoutComponent,
        TemplateComponent,
        UserProfileFormFieldsComponent,
        doMakeUserConfirmPassword,
        doUseDefaultCss,
        classes,
      };
    case 'login-recovery-authn-code-config.ftl':
      return {
        PageComponent: (
          await import(
            './pages/login-recovery-authn-code-config/login-recovery-authn-code-config.component'
          )
        ).LoginRecoveryAuthnCodeConfigComponent,
        TemplateComponent,
        UserProfileFormFieldsComponent,
        doMakeUserConfirmPassword,
        doUseDefaultCss,
        classes,
      };
    case 'login-recovery-authn-code-input.ftl':
      return {
        PageComponent: (
          await import(
            './pages/login-recovery-authn-code-input/login-recovery-authn-code-input.component'
          )
        ).LoginRecoveryAuthnCodeInputComponent,
        TemplateComponent,
        UserProfileFormFieldsComponent,
        doMakeUserConfirmPassword,
        doUseDefaultCss,
        classes,
      };
    case 'login-reset-otp.ftl':
      return {
        PageComponent: (
          await import('./pages/login-reset-otp/login-reset-otp.component')
        ).LoginResetOtpComponent,
        TemplateComponent,
        UserProfileFormFieldsComponent,
        doMakeUserConfirmPassword,
        doUseDefaultCss,
        classes,
      };
    case 'login-x509-info.ftl':
      return {
        PageComponent: (
          await import('./pages/login-x509-info/login-x509-info.component')
        ).LoginX509InfoComponent,
        TemplateComponent,
        UserProfileFormFieldsComponent,
        doMakeUserConfirmPassword,
        doUseDefaultCss,
        classes,
      };
    case 'webauthn-error.ftl':
      return {
        PageComponent: (
          await import('./pages/webauthn-error/webauthn-error.component')
        ).WebauthnErrorComponent,
        TemplateComponent,
        UserProfileFormFieldsComponent,
        doMakeUserConfirmPassword,
        doUseDefaultCss,
        classes,
      };
    case 'login-passkeys-conditional-authenticate.ftl':
      return {
        PageComponent: (
          await import(
            './pages/login-passkeys-conditional-authenticate/login-passkeys-conditional-authenticate.component'
          )
        ).LoginPasskeysConditionalAuthenticateComponent,
        TemplateComponent,
        UserProfileFormFieldsComponent,
        doMakeUserConfirmPassword,
        doUseDefaultCss,
        classes,
      };
    case 'login-idp-link-confirm-override.ftl':
      return {
        PageComponent: (
          await import(
            './pages/login-idp-link-confirm-override/login-idp-link-confirm-override.component'
          )
        ).LoginIdpLinkConfirmOverrideComponent,
        TemplateComponent,
        UserProfileFormFieldsComponent,
        doMakeUserConfirmPassword,
        doUseDefaultCss,
        classes,
      };
    default:
      return {
        PageComponent: await getDefaultPageComponent(pageId),
        TemplateComponent,
        UserProfileFormFieldsComponent,
        doMakeUserConfirmPassword,
        doUseDefaultCss,
        classes,
      };
  }
}

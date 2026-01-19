<!DOCTYPE html>
<html lang="${(locale.currentLanguageTag)!'ru'}">
<head>
  <meta charset="utf-8">
  <meta name="robots" content="noindex, nofollow">
  <title>${msg("auth-recovery-code-header")}</title>
  <link rel="icon" href="${url.resourcesPath}/img/favicon.ico" />
  <link rel="stylesheet" href="${url.resourcesPath}/css/login.css" />
  <#if scripts??>
    <#list scripts as script>
      <script src="${script}" type="text/javascript"></script>
    </#list>
  </#if>
</head>
<body>
  <div class="kc-page">
    <main class="kc-card">
      <header class="kc-header">
        <h1 class="kc-title">${msg("auth-recovery-code-header")}</h1>
      </header>

      <#if message?has_content && (message.type != 'warning' || !isAppInitiatedAction??)>
        <#assign messageType = (message.type)!'info'>
        <div class="kc-message kc-message-${messageType}">${kcSanitize(message.summary)?no_esc}</div>
      </#if>

      <form id="kc-recovery-code-login-form" action="${url.loginAction}" method="post" novalidate="novalidate">
        <#assign recoveryError = messagesPerField.getFirstError('recoveryCodeInput')!''>
        <div class="kc-field">
          <label class="kc-label" for="kc-recovery-code">${msg("auth-recovery-code-prompt", recoveryAuthnCodesInputBean.codeNumber?c)}</label>
          <input id="kc-recovery-code" class="kc-input" name="recoveryCodeInput" type="text" autocomplete="one-time-code" autofocus>
          <#if recoveryError?has_content>
            <div class="kc-error">${kcSanitize(recoveryError)?no_esc}</div>
          </#if>
        </div>

        <div class="kc-actions">
          <button class="kc-button" type="submit">${msg("doLogIn")}</button>
        </div>
      </form>
    </main>
  </div>
</body>
</html>

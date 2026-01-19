<!DOCTYPE html>
<html lang="${(locale.currentLanguageTag)!'ru'}">
<head>
  <meta charset="utf-8">
  <meta name="robots" content="noindex, nofollow">
  <title>${msg("updatePasswordTitle")}</title>
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
        <h1 class="kc-title">${msg("updatePasswordTitle")}</h1>
      </header>

      <#if message?has_content && (message.type != 'warning' || !isAppInitiatedAction??)>
        <#assign messageType = (message.type)!'info'>
        <div class="kc-message kc-message-${messageType}">${kcSanitize(message.summary)?no_esc}</div>
      </#if>

      <form id="kc-passwd-update-form" action="${url.loginAction}" method="post" novalidate="novalidate">
        <#assign newPasswordError = messagesPerField.getFirstError('password')!''>
        <div class="kc-field">
          <label class="kc-label" for="kc-password-new">${msg("passwordNew")}</label>
          <input id="kc-password-new" class="kc-input" name="password-new" type="password" autocomplete="new-password" autofocus>
          <#if newPasswordError?has_content>
            <div class="kc-error">${kcSanitize(newPasswordError)?no_esc}</div>
          </#if>
        </div>

        <#assign passwordConfirmError = messagesPerField.getFirstError('password-confirm')!''>
        <div class="kc-field">
          <label class="kc-label" for="kc-password-confirm">${msg("passwordConfirm")}</label>
          <input id="kc-password-confirm" class="kc-input" name="password-confirm" type="password" autocomplete="new-password">
          <#if passwordConfirmError?has_content>
            <div class="kc-error">${kcSanitize(passwordConfirmError)?no_esc}</div>
          </#if>
        </div>

        <div class="kc-field">
          <label class="kc-checkbox" for="logout-sessions">
            <input type="checkbox" id="logout-sessions" name="logout-sessions" value="on" checked>
            <span>${msg("logoutOtherSessions")}</span>
          </label>
        </div>

        <div class="kc-actions <#if isAppInitiatedAction??>kc-actions-row</#if>">
          <#if isAppInitiatedAction??>
            <button class="kc-button" type="submit">${msg("doSubmit")}</button>
            <button class="kc-button kc-button-secondary" type="submit" name="cancel-aia" value="true" formnovalidate>${msg("doCancel")}</button>
          <#else>
            <button class="kc-button" type="submit">${msg("doSubmit")}</button>
          </#if>
        </div>
      </form>
    </main>
  </div>
</body>
</html>

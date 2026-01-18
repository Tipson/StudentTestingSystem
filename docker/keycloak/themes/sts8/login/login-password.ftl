<!DOCTYPE html>
<html lang="${(locale.currentLanguageTag)!'ru'}">
<head>
  <meta charset="utf-8">
  <meta name="robots" content="noindex, nofollow">
  <title>${msg("doLogIn")}</title>
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
        <h1 class="kc-title">${msg("doLogIn")}</h1>
        <p class="kc-subtitle">${msg("loginSubtitle")}</p>
      </header>

      <#if message?has_content && (message.type != 'warning' || !isAppInitiatedAction??)>
        <#assign messageType = (message.type)!'info'>
        <div class="kc-message kc-message-${messageType}">${kcSanitize(message.summary)?no_esc}</div>
      </#if>

      <form id="kc-form-login" action="${url.loginAction}" method="post" novalidate="novalidate">
        <#if auth?has_content && auth.showUsername()>
          <div class="kc-field">
            <label class="kc-label">${msg("username")}</label>
            <input class="kc-input" value="${auth.attemptedUsername}" readonly>
            <a class="kc-link" href="${url.loginRestartFlowUrl}">${msg("restartLoginTooltip")}</a>
          </div>
        </#if>

        <#assign passwordError = messagesPerField.getFirstError('password')!''>
        <div class="kc-field">
          <label class="kc-label" for="kc-password">${msg("password")}</label>
          <input id="kc-password" class="kc-input" name="password" type="password" autocomplete="current-password" autofocus>
          <#if passwordError?has_content>
            <div class="kc-error">${kcSanitize(passwordError)?no_esc}</div>
          </#if>
        </div>

        <#if realm.resetPasswordAllowed>
          <div class="kc-links">
            <a class="kc-link" href="${url.loginResetCredentialsUrl}">${msg("doForgotPassword")}</a>
          </div>
        </#if>

        <div class="kc-actions">
          <button class="kc-button" type="submit">${msg("doLogIn")}</button>
        </div>
      </form>
    </main>
  </div>
</body>
</html>

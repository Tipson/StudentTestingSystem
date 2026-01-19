<!DOCTYPE html>
<html lang="${(locale.currentLanguageTag)!'ru'}">
<head>
  <meta charset="utf-8">
  <meta name="robots" content="noindex, nofollow">
  <title>${msg("emailForgotTitle")}</title>
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
        <h1 class="kc-title">${msg("emailForgotTitle")}</h1>
        <p class="kc-subtitle">${msg("doForgotPassword")}</p>
      </header>

      <#if message?has_content && (message.type != 'warning' || !isAppInitiatedAction??)>
        <#assign messageType = (message.type)!'info'>
        <div class="kc-message kc-message-${messageType}">${kcSanitize(message.summary)?no_esc}</div>
      </#if>

      <p class="kc-note">
        <#if realm.duplicateEmailsAllowed>
          ${msg("emailInstructionUsername")}
        <#else>
          ${msg("emailInstruction")}
        </#if>
      </p>

      <form id="kc-reset-password-form" action="${url.loginAction}" method="post" novalidate="novalidate">
        <#assign label>
          <#if !realm.loginWithEmailAllowed>
            ${msg("username")}
          <#elseif !realm.registrationEmailAsUsername>
            ${msg("usernameOrEmail")}
          <#else>
            ${msg("email")}
          </#if>
        </#assign>
        <#assign usernameError = messagesPerField.getFirstError('username')!''>
        <div class="kc-field">
          <label class="kc-label" for="kc-username">${label}</label>
          <input id="kc-username" class="kc-input" name="username" type="text" value="${auth.attemptedUsername!''}" autocomplete="username" autofocus>
          <#if usernameError?has_content>
            <div class="kc-error">${kcSanitize(usernameError)?no_esc}</div>
          </#if>
        </div>

        <div class="kc-actions">
          <button class="kc-button" type="submit">${msg("doSubmit")}</button>
        </div>
      </form>

      <div class="kc-links">
        <a class="kc-link" href="${url.loginUrl}">${msg("backToLogin")}</a>
      </div>
    </main>
  </div>
</body>
</html>

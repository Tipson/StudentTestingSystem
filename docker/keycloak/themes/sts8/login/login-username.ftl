<#assign registrationIsDisabled = (registrationDisabled?? && registrationDisabled)>
<!DOCTYPE html>
<html lang="${(locale.currentLanguageTag)!'ru'}">
<head>
  <meta charset="utf-8">
  <meta name="robots" content="noindex, nofollow">
  <title>${msg("loginTitle", (realm.displayName!''))}</title>
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
        <h1 class="kc-title">${msg("loginAccountTitle")}</h1>
        <p class="kc-subtitle">${msg("loginSubtitle")}</p>
      </header>

      <#if message?has_content && (message.type != 'warning' || !isAppInitiatedAction??)>
        <#assign messageType = (message.type)!'info'>
        <div class="kc-message kc-message-${messageType}">${kcSanitize(message.summary)?no_esc}</div>
      </#if>

      <#if realm.password>
        <form id="kc-form-login" action="${url.loginAction}" method="post" novalidate="novalidate">
          <#if !usernameHidden??>
            <#assign usernameLabel>
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
              <label class="kc-label" for="kc-username">${usernameLabel}</label>
              <input id="kc-username" class="kc-input" name="username" type="text" value="${login.username!''}" autocomplete="username" autofocus>
              <#if usernameError?has_content>
                <div class="kc-error">${kcSanitize(usernameError)?no_esc}</div>
              </#if>
            </div>
          </#if>

          <#if realm.rememberMe && !usernameHidden??>
            <div class="kc-field">
              <label class="kc-checkbox">
                <input type="checkbox" name="rememberMe"<#if login.rememberMe?? && login.rememberMe> checked</#if>>
                <span>${msg("rememberMe")}</span>
              </label>
            </div>
          </#if>

          <div class="kc-actions">
            <button class="kc-button" type="submit">${msg("doLogIn")}</button>
          </div>
        </form>
      </#if>

      <div class="kc-links">
        <#if realm.password && realm.registrationAllowed && !registrationIsDisabled>
          <span>${msg("noAccount")}</span>
          <a class="kc-link" href="${url.registrationUrl}">${msg("doRegister")}</a>
        </#if>
      </div>
    </main>
  </div>
</body>
</html>

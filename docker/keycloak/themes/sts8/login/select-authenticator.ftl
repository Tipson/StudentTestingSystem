<!DOCTYPE html>
<html lang="${(locale.currentLanguageTag)!'ru'}">
<head>
  <meta charset="utf-8">
  <meta name="robots" content="noindex, nofollow">
  <title>${msg("loginChooseAuthenticator")}</title>
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
        <h1 class="kc-title">${msg("loginChooseAuthenticator")}</h1>
      </header>

      <div class="kc-option-list">
        <#list auth.authenticationSelections as authenticationSelection>
          <form id="kc-select-credential-form-${authenticationSelection?index}" action="${url.loginAction}" method="post">
            <input type="hidden" name="authenticationExecution" value="${authenticationSelection.authExecId}">
            <button type="submit" class="kc-option-card">
              <span class="kc-option-title">${msg(authenticationSelection.displayName)}</span>
              <span class="kc-option-desc">${msg(authenticationSelection.helpText)}</span>
            </button>
          </form>
        </#list>
      </div>
    </main>
  </div>
</body>
</html>

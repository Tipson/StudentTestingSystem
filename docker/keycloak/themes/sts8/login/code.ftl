<!DOCTYPE html>
<html lang="${(locale.currentLanguageTag)!'ru'}">
<head>
  <meta charset="utf-8">
  <meta name="robots" content="noindex, nofollow">
  <title>
    <#if code.success>
      ${msg("codeSuccessTitle")}
    <#else>
      ${msg("codeErrorTitle", code.error)}
    </#if>
  </title>
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
        <#if code.success>
          <h1 class="kc-title">${msg("codeSuccessTitle")}</h1>
        <#else>
          <h1 class="kc-title">${msg("codeErrorTitle", code.error)}</h1>
        </#if>
      </header>

      <#if code.success>
        <p class="kc-note">${msg("copyCodeInstruction")}</p>
        <div class="kc-field">
          <input class="kc-input" type="text" value="${code.code}" readonly>
        </div>
      <#else>
        <div class="kc-message kc-message-error">${kcSanitize(code.error)?no_esc}</div>
      </#if>
    </main>
  </div>
</body>
</html>

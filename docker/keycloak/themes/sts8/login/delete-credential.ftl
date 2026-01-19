<!DOCTYPE html>
<html lang="${(locale.currentLanguageTag)!'ru'}">
<head>
  <meta charset="utf-8">
  <meta name="robots" content="noindex, nofollow">
  <title>${msg("deleteCredentialTitle", credentialLabel)}</title>
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
        <h1 class="kc-title">${msg("deleteCredentialTitle", credentialLabel)}</h1>
      </header>

      <div class="kc-note">${msg("deleteCredentialMessage", credentialLabel)}</div>

      <form action="${url.loginAction}" method="post">
        <div class="kc-actions kc-actions-row">
          <button class="kc-button" type="submit" name="accept" id="kc-accept">${msg("doConfirmDelete")}</button>
          <button class="kc-button kc-button-secondary" type="submit" name="cancel-aia" id="kc-decline">${msg("doDecline")}</button>
        </div>
      </form>
    </main>
  </div>
</body>
</html>

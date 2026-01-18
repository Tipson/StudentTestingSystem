<!DOCTYPE html>
<html lang="${(locale.currentLanguageTag)!'ru'}">
<head>
  <meta charset="utf-8">
  <meta name="robots" content="noindex, nofollow">
  <title>${msg("deleteAccountConfirm")}</title>
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
        <h1 class="kc-title">${msg("deleteAccountConfirm")}</h1>
      </header>

      <div class="kc-message kc-message-warning">${msg("irreversibleAction")}</div>

      <p>${msg("deletingImplies")}</p>
      <ul class="kc-list">
        <li>${msg("loggingOutImmediately")}</li>
        <li>${msg("errasingData")}</li>
      </ul>

      <p class="kc-help">${msg("finalDeletionConfirmation")}</p>

      <form action="${url.loginAction}" id="kc-deleteaccount-form" method="post">
        <div class="kc-actions kc-actions-row">
          <button class="kc-button" type="submit">${msg("doConfirmDelete")}</button>
          <#if triggered_from_aia>
            <button class="kc-button kc-button-secondary" type="submit" name="cancel-aia">${msg("doCancel")}</button>
          </#if>
        </div>
      </form>
    </main>
  </div>
</body>
</html>

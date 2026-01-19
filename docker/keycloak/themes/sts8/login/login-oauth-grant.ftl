<!DOCTYPE html>
<html lang="${(locale.currentLanguageTag)!'ru'}">
<head>
  <meta charset="utf-8">
  <meta name="robots" content="noindex, nofollow">
  <title>
    <#if client.name?has_content>
      ${msg("oauthGrantTitle", advancedMsg(client.name))}
    <#else>
      ${msg("oauthGrantTitle", client.clientId)}
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
        <h1 class="kc-title">
          <#if client.name?has_content>
            ${msg("oauthGrantTitle", advancedMsg(client.name))}
          <#else>
            ${msg("oauthGrantTitle", client.clientId)}
          </#if>
        </h1>
      </header>

      <p class="kc-note">${msg("oauthGrantRequest")}</p>

      <#if oauth.clientScopesRequested??>
        <ul class="kc-list">
          <#list oauth.clientScopesRequested as clientScope>
            <li>
              <#if !clientScope.dynamicScopeParameter??>
                ${advancedMsg(clientScope.consentScreenText)}
              <#else>
                ${advancedMsg(clientScope.consentScreenText)}: <strong>${clientScope.dynamicScopeParameter}</strong>
              </#if>
            </li>
          </#list>
        </ul>
      </#if>

      <#if client.attributes.policyUri?? || client.attributes.tosUri??>
        <div class="kc-divider"></div>
        <div class="kc-links">
          <#if client.attributes.tosUri??>
            <a class="kc-link" href="${client.attributes.tosUri}" target="_blank">${msg("oauthGrantTos")}</a>
          </#if>
          <#if client.attributes.policyUri??>
            <a class="kc-link" href="${client.attributes.policyUri}" target="_blank">${msg("oauthGrantPolicy")}</a>
          </#if>
        </div>
      </#if>

      <form action="${url.oauthAction}" method="post" novalidate="novalidate">
        <input type="hidden" name="code" value="${oauth.code}">
        <div class="kc-actions kc-actions-row">
          <button class="kc-button" type="submit" name="accept">${msg("doYes")}</button>
          <button class="kc-button kc-button-secondary" type="submit" name="cancel">${msg("doNo")}</button>
        </div>
      </form>
    </main>
  </div>
</body>
</html>

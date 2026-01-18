<!DOCTYPE html>
<html lang="${(locale.currentLanguageTag)!'ru'}">
<head>
  <meta charset="utf-8">
  <meta name="robots" content="noindex, nofollow">
  <title>${msg("webauthn-registration-title")}</title>
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
        <h1 class="kc-title">${kcSanitize(msg("webauthn-registration-title"))?no_esc}</h1>
      </header>

      <form id="register" action="${url.loginAction}" method="post">
        <input type="hidden" id="clientDataJSON" name="clientDataJSON"/>
        <input type="hidden" id="attestationObject" name="attestationObject"/>
        <input type="hidden" id="publicKeyCredentialId" name="publicKeyCredentialId"/>
        <input type="hidden" id="authenticatorLabel" name="authenticatorLabel"/>
        <input type="hidden" id="transports" name="transports"/>
        <input type="hidden" id="error" name="error"/>
      </form>

      <div class="kc-actions kc-actions-row">
        <button id="registerWebAuthn" class="kc-button" type="button">${msg("doRegisterSecurityKey")}</button>
        <#if !isSetRetry?has_content && isAppInitiatedAction?has_content>
          <form action="${url.loginAction}" id="kc-webauthn-settings-form" method="post">
            <button class="kc-button kc-button-secondary" id="cancelWebAuthnAIA" name="cancel-aia" type="submit">${msg("doCancel")}</button>
          </form>
        </#if>
      </div>
    </main>
  </div>

  <script type="module">
    import { registerByWebAuthn } from "${url.resourcesPath}/js/webauthnRegister.js";
    const registerButton = document.getElementById('registerWebAuthn');
    registerButton.addEventListener("click", function() {
      const input = {
        challenge: '${challenge}',
        userid: '${userid}',
        username: '${username}',
        signatureAlgorithms: [<#list signatureAlgorithms as sigAlg>${sigAlg?c},</#list>],
        rpEntityName: '${rpEntityName}',
        rpId: '${rpId}',
        attestationConveyancePreference: '${attestationConveyancePreference}',
        authenticatorAttachment: '${authenticatorAttachment}',
        requireResidentKey: '${requireResidentKey}',
        userVerificationRequirement: '${userVerificationRequirement}',
        createTimeout: ${createTimeout},
        excludeCredentialIds: '${excludeCredentialIds}',
        initLabel: "${msg("webauthn-registration-init-label")?no_esc}",
        initLabelPrompt: "${msg("webauthn-registration-init-label-prompt")?no_esc}",
        errmsg: "${msg("webauthn-unsupported-browser-text")?no_esc}"
      };
      registerByWebAuthn(input);
    });
  </script>
</body>
</html>

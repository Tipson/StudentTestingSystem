<#assign registrationIsDisabled = (registrationDisabled?? && registrationDisabled)>
<!DOCTYPE html>
<html lang="${(locale.currentLanguageTag)!'ru'}">
<head>
  <meta charset="utf-8">
  <meta name="robots" content="noindex, nofollow">
  <title>${msg("webauthn-login-title")}</title>
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
        <h1 class="kc-title">${kcSanitize(msg("webauthn-login-title"))?no_esc}</h1>
      </header>

      <#if message?has_content && (message.type != 'warning' || !isAppInitiatedAction??)>
        <#assign messageType = (message.type)!'info'>
        <div class="kc-message kc-message-${messageType}">${kcSanitize(message.summary)?no_esc}</div>
      </#if>

      <form id="webauth" action="${url.loginAction}" method="post">
        <input type="hidden" id="clientDataJSON" name="clientDataJSON"/>
        <input type="hidden" id="authenticatorData" name="authenticatorData"/>
        <input type="hidden" id="signature" name="signature"/>
        <input type="hidden" id="credentialId" name="credentialId"/>
        <input type="hidden" id="userHandle" name="userHandle"/>
        <input type="hidden" id="error" name="error"/>
      </form>

      <#if authenticators??>
        <form id="authn_select">
          <#list authenticators.authenticators as authenticator>
            <input type="hidden" name="authn_use_chk" value="${authenticator.credentialId}"/>
          </#list>
        </form>

        <#if shouldDisplayAuthenticators?? && shouldDisplayAuthenticators>
          <div class="kc-option-list">
            <#list authenticators.authenticators as authenticator>
              <button type="button" class="kc-option-card" onclick="selectAuthenticator('${authenticator.credentialId}', this)">
                <span class="kc-option-title">${kcSanitize(authenticator.label)?no_esc}</span>
                <#if authenticator.transports?? && authenticator.transports.displayNameProperties?has_content>
                  <span class="kc-option-desc">
                    <#list authenticator.transports.displayNameProperties as nameProperty>
                      ${kcSanitize(msg(nameProperty))?no_esc}<#if nameProperty?has_next>, </#if>
                    </#list>
                  </span>
                </#if>
              </button>
            </#list>
          </div>
        </#if>
      </#if>

      <div class="kc-actions">
        <button id="authenticateWebAuthnButton" type="button" class="kc-button">${kcSanitize(msg("webauthn-doAuthenticate"))?no_esc}</button>
      </div>

      <#if realm.registrationAllowed && !registrationIsDisabled>
        <div class="kc-links">
          <span>${msg("noAccount")}</span>
          <a class="kc-link" href="${url.registrationUrl}">${msg("doRegister")}</a>
        </div>
      </#if>
    </main>
  </div>

  <script>
    function selectAuthenticator(value, button) {
      document.getElementById("credentialId").value = value;
      var items = document.querySelectorAll(".kc-option-card");
      items.forEach(function(item) { item.classList.remove("is-active"); });
      if (button) {
        button.classList.add("is-active");
      }
    }
  </script>

  <script type="module">
    import { authenticateByWebAuthn } from "${url.resourcesPath}/js/webauthnAuthenticate.js";
    const authButton = document.getElementById('authenticateWebAuthnButton');
    authButton.addEventListener("click", function() {
      const input = {
        isUserIdentified: ${isUserIdentified},
        challenge: '${challenge}',
        userVerification: '${userVerification}',
        rpId: '${rpId}',
        createTimeout: ${createTimeout},
        errmsg: "${msg("webauthn-unsupported-browser-text")?no_esc}"
      };
      authenticateByWebAuthn(input);
    });
  </script>
</body>
</html>

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
        <p class="kc-subtitle">${msg("loginOtpOneTime")}</p>
      </header>

      <#if message?has_content && (message.type != 'warning' || !isAppInitiatedAction??)>
        <#assign messageType = (message.type)!'info'>
        <div class="kc-message kc-message-${messageType}">${kcSanitize(message.summary)?no_esc}</div>
      </#if>

      <form id="kc-otp-login-form" action="${url.loginAction}" method="post" novalidate="novalidate">
        <input id="selectedCredentialId" type="hidden" name="selectedCredentialId" value="${otpLogin.selectedCredentialId!''}">

        <#if otpLogin.userOtpCredentials?size gt 1>
          <div class="kc-otp-list">
            <#list otpLogin.userOtpCredentials as otpCredential>
              <button type="button" class="kc-otp-item" onclick="selectOtp('${otpCredential.id}', this)">
                ${otpCredential.userLabel}
              </button>
            </#list>
          </div>
        </#if>

        <#assign otpError = messagesPerField.getFirstError('totp')!''>
        <div class="kc-field">
          <label class="kc-label" for="kc-otp">${msg("loginOtpOneTime")}</label>
          <input id="kc-otp" class="kc-input" name="otp" type="text" autocomplete="one-time-code" autofocus>
          <#if otpError?has_content>
            <div class="kc-error">${kcSanitize(otpError)?no_esc}</div>
          </#if>
        </div>

        <div class="kc-actions">
          <button class="kc-button" type="submit">${msg("doLogIn")}</button>
        </div>
      </form>
    </main>
  </div>

  <script>
    function selectOtp(value, button) {
      document.getElementById("selectedCredentialId").value = value;
      var items = document.querySelectorAll(".kc-otp-item");
      items.forEach(function(item) { item.classList.remove("is-active"); });
      if (button) {
        button.classList.add("is-active");
      }
    }
  </script>
</body>
</html>

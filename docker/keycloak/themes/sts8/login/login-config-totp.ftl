<!DOCTYPE html>
<html lang="${(locale.currentLanguageTag)!'ru'}">
<head>
  <meta charset="utf-8">
  <meta name="robots" content="noindex, nofollow">
  <title>${msg("loginTotpTitle")}</title>
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
        <h1 class="kc-title">${msg("loginTotpTitle")}</h1>
      </header>

      <#if message?has_content && (message.type != 'warning' || !isAppInitiatedAction??)>
        <#assign messageType = (message.type)!'info'>
        <div class="kc-message kc-message-${messageType}">${kcSanitize(message.summary)?no_esc}</div>
      </#if>

      <ol class="kc-list">
        <li>
          <p>${msg("loginTotpStep1")}</p>
          <ul class="kc-list">
            <#list totp.supportedApplications as app>
              <li>${msg(app)}</li>
            </#list>
          </ul>
        </li>

        <#if mode?? && mode = "manual">
          <li>
            <p>${msg("loginTotpManualStep2")}</p>
            <p><span class="kc-code" id="kc-totp-secret-key">${totp.totpSecretEncoded}</span></p>
            <p><a class="kc-link" href="${totp.qrUrl}" id="mode-barcode">${msg("loginTotpScanBarcode")}</a></p>
          </li>
          <li>
            <p>${msg("loginTotpManualStep3")}</p>
            <ul class="kc-list">
              <li>${msg("loginTotpType")}: ${msg("loginTotp." + totp.policy.type)}</li>
              <li>${msg("loginTotpAlgorithm")}: ${totp.policy.getAlgorithmKey()}</li>
              <li>${msg("loginTotpDigits")}: ${totp.policy.digits}</li>
              <#if totp.policy.type = "totp">
                <li>${msg("loginTotpInterval")}: ${totp.policy.period}</li>
              <#elseif totp.policy.type = "hotp">
                <li>${msg("loginTotpCounter")}: ${totp.policy.initialCounter}</li>
              </#if>
            </ul>
          </li>
        <#else>
          <li>
            <p>${msg("loginTotpStep2")}</p>
            <img class="kc-qr" id="kc-totp-secret-qr-code" src="data:image/png;base64, ${totp.totpSecretQrCode}" alt="qr">
            <p><a class="kc-link" href="${totp.manualUrl}" id="mode-manual">${msg("loginTotpUnableToScan")}</a></p>
          </li>
        </#if>
        <li>
          <p>${msg("loginTotpStep3")}</p>
          <p class="kc-help">${msg("loginTotpStep3DeviceName")}</p>
        </li>
      </ol>

      <form action="${url.loginAction}" id="kc-totp-settings-form" method="post" novalidate="novalidate">
        <#assign totpError = messagesPerField.getFirstError('totp')!''>
        <div class="kc-field">
          <label class="kc-label" for="kc-totp">${msg("authenticatorCode")}</label>
          <input id="kc-totp" class="kc-input" type="text" name="totp" autocomplete="off" required>
          <#if totpError?has_content>
            <div class="kc-error">${kcSanitize(totpError)?no_esc}</div>
          </#if>
          <input type="hidden" id="totpSecret" name="totpSecret" value="${totp.totpSecret}" />
          <#if mode??><input type="hidden" id="mode" name="mode" value="${mode}"/></#if>
        </div>

        <#assign userLabelError = messagesPerField.getFirstError('userLabel')!''>
        <div class="kc-field">
          <label class="kc-label" for="kc-user-label">${msg("loginTotpDeviceName")}<#if totp.otpCredentials?size gte 1> <span class="kc-required">*</span></#if></label>
          <input id="kc-user-label" class="kc-input" type="text" name="userLabel" autocomplete="off"<#if totp.otpCredentials?size gte 1> required</#if>>
          <#if userLabelError?has_content>
            <div class="kc-error">${kcSanitize(userLabelError)?no_esc}</div>
          </#if>
        </div>

        <div class="kc-field">
          <label class="kc-checkbox" for="logout-sessions">
            <input type="checkbox" id="logout-sessions" name="logout-sessions" value="on" checked>
            <span>${msg("logoutOtherSessions")}</span>
          </label>
        </div>

        <div class="kc-actions <#if isAppInitiatedAction??>kc-actions-row</#if>">
          <#if isAppInitiatedAction??>
            <button class="kc-button" type="submit" id="saveTOTPBtn">${msg("doSubmit")}</button>
            <button class="kc-button kc-button-secondary" type="submit" id="cancelTOTPBtn" name="cancel-aia" value="true" formnovalidate>${msg("doCancel")}</button>
          <#else>
            <button class="kc-button" type="submit" id="saveTOTPBtn">${msg("doSubmit")}</button>
          </#if>
        </div>
      </form>
    </main>
  </div>
</body>
</html>

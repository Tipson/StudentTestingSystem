<!DOCTYPE html>
<html lang="${(locale.currentLanguageTag)!'ru'}">
<head>
  <meta charset="utf-8">
  <meta name="robots" content="noindex, nofollow">
  <title>${msg("recovery-code-config-header")}</title>
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
        <h1 class="kc-title">${msg("recovery-code-config-header")}</h1>
      </header>

      <div class="kc-message kc-message-warning">
        <strong>${msg("recovery-code-config-warning-title")}</strong>
        <div class="kc-help">${msg("recovery-code-config-warning-message")}</div>
      </div>

      <ol id="kc-recovery-codes-list" class="kc-list kc-list-codes" role="list">
        <#list recoveryAuthnCodesConfigBean.generatedRecoveryAuthnCodesList as code>
          <li>${code[0..3]}-${code[4..7]}-${code[8..]}</li>
        </#list>
      </ol>

      <div class="kc-actions-inline">
        <button id="printRecoveryCodes" class="kc-button kc-button-secondary" type="button" onclick="printRecoveryCodes()">${msg("recovery-codes-print")}</button>
        <button id="downloadRecoveryCodes" class="kc-button kc-button-secondary" type="button" onclick="downloadRecoveryCodes()">${msg("recovery-codes-download")}</button>
        <button id="copyRecoveryCodes" class="kc-button kc-button-secondary" type="button" onclick="copyRecoveryCodes()">${msg("recovery-codes-copy")}</button>
      </div>

      <div class="kc-field">
        <label class="kc-checkbox" for="kcRecoveryCodesConfirmationCheck">
          <input type="checkbox" id="kcRecoveryCodesConfirmationCheck" name="kcRecoveryCodesConfirmationCheck" onchange="document.getElementById('saveRecoveryAuthnCodesBtn').disabled = !this.checked;">
          <span>${msg("recovery-codes-confirmation-message")}</span>
        </label>
      </div>

      <form action="${url.loginAction}" id="kc-recovery-codes-settings-form" method="post">
        <input type="hidden" name="generatedRecoveryAuthnCodes" value="${recoveryAuthnCodesConfigBean.generatedRecoveryAuthnCodesAsString}" />
        <input type="hidden" name="generatedAt" value="${recoveryAuthnCodesConfigBean.generatedAt?c}" />
        <input type="hidden" id="userLabel" name="userLabel" value="${msg("recovery-codes-label-default")}" />

        <div class="kc-field">
          <label class="kc-checkbox" for="logout-sessions">
            <input type="checkbox" id="logout-sessions" name="logout-sessions" value="on" checked>
            <span>${msg("logoutOtherSessions")}</span>
          </label>
        </div>

        <div class="kc-actions <#if isAppInitiatedAction??>kc-actions-row</#if>">
          <#if isAppInitiatedAction??>
            <button class="kc-button" type="submit" id="saveRecoveryAuthnCodesBtn" disabled>${msg("recovery-codes-action-complete")}</button>
            <button class="kc-button kc-button-secondary" type="submit" id="cancelRecoveryAuthnCodesBtn" name="cancel-aia" value="true">${msg("recovery-codes-action-cancel")}</button>
          <#else>
            <button class="kc-button" type="submit" id="saveRecoveryAuthnCodesBtn" disabled>${msg("recovery-codes-action-complete")}</button>
          </#if>
        </div>
      </form>
    </main>
  </div>

  <script>
    function copyRecoveryCodes() {
      var tmpTextarea = document.createElement("textarea");
      tmpTextarea.innerHTML = parseRecoveryCodeList();
      document.body.appendChild(tmpTextarea);
      tmpTextarea.select();
      document.execCommand("copy");
      document.body.removeChild(tmpTextarea);
    }

    function formatCurrentDateTime() {
      var dt = new Date();
      var options = {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        timeZoneName: 'short'
      };

      return dt.toLocaleString(undefined, options);
    }

    function parseRecoveryCodeList() {
      var recoveryCodes = document.getElementById("kc-recovery-codes-list").getElementsByTagName("li");
      var recoveryCodeList = "";

      for (var i = 0; i < recoveryCodes.length; i++) {
        var recoveryCodeLiElement = recoveryCodes[i].innerText;
        recoveryCodeList += i + ": " + recoveryCodeLiElement + "\r\n";
      }

      return recoveryCodeList;
    }

    function buildDownloadContent() {
      var recoveryCodeList = parseRecoveryCodeList();
      return "${msg("recovery-codes-download-file-header")}" + "\n\n" +
        recoveryCodeList + "\n" +
        "${msg("recovery-codes-download-file-description")}" + "\n\n" +
        "${msg("recovery-codes-download-file-date")}" + " " + formatCurrentDateTime();
    }

    function setUpDownloadLinkAndDownload(filename, text) {
      var el = document.createElement('a');
      el.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
      el.setAttribute('download', filename);
      el.style.display = 'none';
      document.body.appendChild(el);
      el.click();
      document.body.removeChild(el);
    }

    function downloadRecoveryCodes() {
      setUpDownloadLinkAndDownload('kc-download-recovery-codes.txt', buildDownloadContent());
    }

    function buildPrintContent() {
      var recoveryCodeListHTML = document.getElementById('kc-recovery-codes-list').parentNode.innerHTML;
      var styles = '@page { size: auto; margin-top: 0; }' +
        'body { width: 480px; }' +
        'div { font-family: monospace }' +
        'p:first-of-type { margin-top: 48px }';

      return '<html><style>' + styles + '</style><body>' +
        '<title>kc-download-recovery-codes</title>' +
        '<p>${msg("recovery-codes-download-file-header")}</p>' +
        '<div>' + recoveryCodeListHTML + '</div>' +
        '<p>${msg("recovery-codes-download-file-description")}</p>' +
        '<p>${msg("recovery-codes-download-file-date")} ' + formatCurrentDateTime() + '</p>' +
        '</body></html>';
    }

    function printRecoveryCodes() {
      var w = window.open();
      w.document.write(buildPrintContent());
      w.print();
      w.close();
    }
  </script>
</body>
</html>

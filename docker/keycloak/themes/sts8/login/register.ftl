<!DOCTYPE html>
<html lang="${(locale.currentLanguageTag)!'ru'}">
<head>
  <meta charset="utf-8">
  <meta name="robots" content="noindex, nofollow">
  <title>${msg("registerTitle")}</title>
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
        <h1 class="kc-title">${msg("registerTitle")}</h1>
        <p class="kc-subtitle">${msg("registerSubtitle")}</p>
      </header>

      <#if message?has_content && (message.type != 'warning' || !isAppInitiatedAction??)>
        <#assign messageType = (message.type)!'info'>
        <div class="kc-message kc-message-${messageType}">${kcSanitize(message.summary)?no_esc}</div>
      </#if>

      <p class="kc-note"><span class="kc-required">*</span> ${msg("requiredFields")}</p>

      <form id="kc-register-form" action="${url.registrationAction}" method="post" novalidate="novalidate">
        <#assign attributes = (profile.attributes)![]>
        <#list attributes as attribute>
          <#assign fieldName = attribute.name>
          <#assign fieldId = "kc-" + fieldName>
          <#assign labelText = advancedMsg(attribute.displayName!'')!''>
          <#if !labelText?has_content>
            <#assign labelText = fieldName>
          </#if>
          <#assign inputType = attribute.annotations.inputType!''>
          <#if inputType?starts_with("html5-")>
            <#assign inputType = inputType[6..]>
          </#if>
          <#assign fieldError = messagesPerField.getFirstError(fieldName)!''>
          <#assign hasMultiValues = attribute.multivalued?? && attribute.multivalued && attribute.values?has_content>
          <#assign labelFor = fieldId>
          <#if hasMultiValues>
            <#assign labelFor = fieldId + "-0">
          </#if>

          <div class="kc-field">
            <label class="kc-label" for="${labelFor}">${labelText}<#if attribute.required> <span class="kc-required">*</span></#if></label>

            <#if attribute.annotations.inputHelperTextBefore??>
              <div class="kc-help">${kcSanitize(advancedMsg(attribute.annotations.inputHelperTextBefore))?no_esc}</div>
            </#if>

            <#if inputType == "textarea">
              <textarea id="${fieldId}" name="${fieldName}" class="kc-textarea"<#if attribute.readOnly> disabled</#if><#if attribute.required> required</#if><#if attribute.annotations.inputTypeCols??> cols="${attribute.annotations.inputTypeCols}"</#if><#if attribute.annotations.inputTypeRows??> rows="${attribute.annotations.inputTypeRows}"</#if><#if attribute.annotations.inputTypeMaxlength??> maxlength="${attribute.annotations.inputTypeMaxlength}"</#if>>${(attribute.value!'')}</textarea>
            <#elseif inputType == "select" || inputType == "multiselect">
              <#assign options = []>
              <#if attribute.annotations.inputOptionsFromValidation?? && attribute.validators?? && attribute.validators[attribute.annotations.inputOptionsFromValidation]?? && attribute.validators[attribute.annotations.inputOptionsFromValidation].options??>
                <#assign options = attribute.validators[attribute.annotations.inputOptionsFromValidation].options>
              <#elseif attribute.validators?? && attribute.validators.options?? && attribute.validators.options.options??>
                <#assign options = attribute.validators.options.options>
              </#if>
              <select id="${fieldId}" name="${fieldName}" class="kc-select"<#if attribute.readOnly> disabled</#if><#if attribute.required> required</#if><#if inputType == "multiselect"> multiple</#if><#if attribute.annotations.inputTypeSize??> size="${attribute.annotations.inputTypeSize}"</#if>>
                <#if inputType == "select">
                  <option value=""></option>
                </#if>
                <#list options as option>
                  <#assign optionLabel = option>
                  <#if attribute.annotations.inputOptionLabels??>
                    <#assign optionLabel = advancedMsg(attribute.annotations.inputOptionLabels[option]!option)>
                  <#elseif attribute.annotations.inputOptionLabelsI18nPrefix??>
                    <#assign optionLabel = msg(attribute.annotations.inputOptionLabelsI18nPrefix + "." + option)>
                  </#if>
                  <#assign isSelected = (attribute.values?seq_contains(option)) || (attribute.value?? && attribute.value == option)>
                  <option value="${option}"<#if isSelected> selected</#if>>${kcSanitize(optionLabel)?no_esc}</option>
                </#list>
              </select>
            <#elseif inputType == "select-radiobuttons" || inputType == "multiselect-checkboxes">
              <#assign options = []>
              <#if attribute.annotations.inputOptionsFromValidation?? && attribute.validators?? && attribute.validators[attribute.annotations.inputOptionsFromValidation]?? && attribute.validators[attribute.annotations.inputOptionsFromValidation].options??>
                <#assign options = attribute.validators[attribute.annotations.inputOptionsFromValidation].options>
              <#elseif attribute.validators?? && attribute.validators.options?? && attribute.validators.options.options??>
                <#assign options = attribute.validators.options.options>
              </#if>
              <#assign optionType = (inputType == "select-radiobuttons")?then("radio", "checkbox")>
              <div class="kc-option-list">
                <#list options as option>
                  <#assign optionLabel = option>
                  <#if attribute.annotations.inputOptionLabels??>
                    <#assign optionLabel = advancedMsg(attribute.annotations.inputOptionLabels[option]!option)>
                  <#elseif attribute.annotations.inputOptionLabelsI18nPrefix??>
                    <#assign optionLabel = msg(attribute.annotations.inputOptionLabelsI18nPrefix + "." + option)>
                  </#if>
                  <#assign isChecked = (attribute.values?seq_contains(option)) || (attribute.value?? && attribute.value == option)>
                  <#assign optionId = fieldId + "-" + option_index>
                  <label class="kc-option" for="${optionId}">
                    <input id="${optionId}" type="${optionType}" name="${fieldName}" value="${option}"<#if isChecked> checked</#if><#if attribute.readOnly> disabled</#if>>
                    <span>${kcSanitize(optionLabel)?no_esc}</span>
                  </label>
                </#list>
              </div>
            <#else>
              <#assign resolvedType = "text">
              <#if inputType?has_content>
                <#assign resolvedType = inputType>
              </#if>
              <#if hasMultiValues>
                <#list attribute.values as value>
                  <#assign inputId = fieldId + "-" + value_index>
                  <input id="${inputId}" name="${fieldName}" class="kc-input" type="${resolvedType}" value="${(value!'')}"<#if attribute.readOnly> disabled</#if><#if attribute.required> required</#if><#if attribute.autocomplete??> autocomplete="${attribute.autocomplete}"</#if><#if attribute.annotations.inputTypePlaceholder??> placeholder="${advancedMsg(attribute.annotations.inputTypePlaceholder)}"</#if><#if attribute.annotations.inputTypePattern??> pattern="${attribute.annotations.inputTypePattern}"</#if><#if attribute.annotations.inputTypeSize??> size="${attribute.annotations.inputTypeSize}"</#if><#if attribute.annotations.inputTypeMaxlength??> maxlength="${attribute.annotations.inputTypeMaxlength}"</#if><#if attribute.annotations.inputTypeMinlength??> minlength="${attribute.annotations.inputTypeMinlength}"</#if><#if attribute.annotations.inputTypeMax??> max="${attribute.annotations.inputTypeMax}"</#if><#if attribute.annotations.inputTypeMin??> min="${attribute.annotations.inputTypeMin}"</#if><#if attribute.annotations.inputTypeStep??> step="${attribute.annotations.inputTypeStep}"</#if><#list attribute.html5DataAnnotations as key, value> data-${key}="${value}"</#list>>
                </#list>
              <#else>
                <input id="${fieldId}" name="${fieldName}" class="kc-input" type="${resolvedType}" value="${(attribute.value!'')}"<#if attribute.readOnly> disabled</#if><#if attribute.required> required</#if><#if attribute.autocomplete??> autocomplete="${attribute.autocomplete}"</#if><#if attribute.annotations.inputTypePlaceholder??> placeholder="${advancedMsg(attribute.annotations.inputTypePlaceholder)}"</#if><#if attribute.annotations.inputTypePattern??> pattern="${attribute.annotations.inputTypePattern}"</#if><#if attribute.annotations.inputTypeSize??> size="${attribute.annotations.inputTypeSize}"</#if><#if attribute.annotations.inputTypeMaxlength??> maxlength="${attribute.annotations.inputTypeMaxlength}"</#if><#if attribute.annotations.inputTypeMinlength??> minlength="${attribute.annotations.inputTypeMinlength}"</#if><#if attribute.annotations.inputTypeMax??> max="${attribute.annotations.inputTypeMax}"</#if><#if attribute.annotations.inputTypeMin??> min="${attribute.annotations.inputTypeMin}"</#if><#if attribute.annotations.inputTypeStep??> step="${attribute.annotations.inputTypeStep}"</#if><#list attribute.html5DataAnnotations as key, value> data-${key}="${value}"</#list>>
              </#if>
            </#if>

            <#if attribute.annotations.inputHelperTextAfter??>
              <div class="kc-help">${kcSanitize(advancedMsg(attribute.annotations.inputHelperTextAfter))?no_esc}</div>
            </#if>

            <#if fieldError?has_content>
              <div class="kc-error">${kcSanitize(fieldError)?no_esc}</div>
            </#if>
          </div>
        </#list>

        <#if passwordRequired?? && passwordRequired>
          <#assign passwordError = messagesPerField.getFirstError('password')!''>
          <div class="kc-field">
            <label class="kc-label" for="kc-password">${msg("password")}</label>
            <input id="kc-password" class="kc-input" name="password" type="password" autocomplete="new-password" required>
            <#if passwordError?has_content>
              <div class="kc-error">${kcSanitize(passwordError)?no_esc}</div>
            </#if>
          </div>

          <#assign passwordConfirmError = messagesPerField.getFirstError('password-confirm')!''>
          <div class="kc-field">
            <label class="kc-label" for="kc-password-confirm">${msg("passwordConfirm")}</label>
            <input id="kc-password-confirm" class="kc-input" name="password-confirm" type="password" autocomplete="new-password" required>
            <#if passwordConfirmError?has_content>
              <div class="kc-error">${kcSanitize(passwordConfirmError)?no_esc}</div>
            </#if>
          </div>
        </#if>

        <#if termsAcceptanceRequired??>
          <div class="kc-field">
            <div class="kc-help"><strong>${msg("termsTitle")}</strong></div>
            <div class="kc-help">${kcSanitize(msg("termsText"))?no_esc}</div>
          </div>
          <#assign termsError = messagesPerField.getFirstError('termsAccepted')!''>
          <div class="kc-field">
            <label class="kc-checkbox" for="kc-terms">
              <input id="kc-terms" type="checkbox" name="termsAccepted">
              <span>${msg("acceptTerms")}</span>
            </label>
            <#if termsError?has_content>
              <div class="kc-error">${kcSanitize(termsError)?no_esc}</div>
            </#if>
          </div>
        </#if>

        <#if recaptchaRequired?? && (recaptchaVisible!false)>
          <div class="kc-field">
            <div class="g-recaptcha" data-size="compact" data-sitekey="${recaptchaSiteKey}" data-action="${recaptchaAction}"></div>
          </div>
        </#if>

        <#if recaptchaRequired?? && !(recaptchaVisible!false)>
          <script>
            function onSubmitRecaptcha(token) {
              document.getElementById("kc-register-form").requestSubmit();
            }
          </script>
        </#if>

        <div class="kc-actions">
          <#if recaptchaRequired?? && !(recaptchaVisible!false)>
            <button class="kc-button g-recaptcha" data-sitekey="${recaptchaSiteKey}" data-callback="onSubmitRecaptcha" data-action="${recaptchaAction}" type="submit" id="kc-submit">${msg("doRegister")}</button>
          <#else>
            <button class="kc-button" type="submit">${msg("doRegister")}</button>
          </#if>
        </div>

        <div class="kc-links">
          <a class="kc-link" href="${url.loginUrl}">${msg("backToLogin")}</a>
        </div>
      </form>
    </main>
  </div>
</body>
</html>

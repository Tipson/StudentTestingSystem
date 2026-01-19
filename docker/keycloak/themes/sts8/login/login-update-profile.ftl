<!DOCTYPE html>
<html lang="${(locale.currentLanguageTag)!'ru'}">
<head>
  <meta charset="utf-8">
  <meta name="robots" content="noindex, nofollow">
  <title>${msg("loginProfileTitle")}</title>
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
        <h1 class="kc-title">${msg("loginProfileTitle")}</h1>
        <p class="kc-subtitle">${msg("profileUpdateSubtitle")}</p>
      </header>

      <#if message?has_content && (message.type != 'warning' || !isAppInitiatedAction??)>
        <#assign messageType = (message.type)!'info'>
        <div class="kc-message kc-message-${messageType}">${kcSanitize(message.summary)?no_esc}</div>
      </#if>

      <form id="kc-update-profile-form" action="${url.loginAction}" method="post" novalidate="novalidate">
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

        <div class="kc-actions <#if isAppInitiatedAction??>kc-actions-row</#if>">
          <#if isAppInitiatedAction??>
            <button class="kc-button" type="submit">${msg("doSubmit")}</button>
            <button class="kc-button kc-button-secondary" type="submit" name="cancel-aia" value="true" formnovalidate>${msg("doCancel")}</button>
          <#else>
            <button class="kc-button" type="submit">${msg("doSubmit")}</button>
          </#if>
        </div>
      </form>
    </main>
  </div>
</body>
</html>

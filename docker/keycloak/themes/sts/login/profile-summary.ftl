<#macro profileSummary title="Profile snapshot">
    <#if profile?? && profile.attributes??>
        <div class="kc-profile-summary">
            <h2 class="kc-profile-summary__title">${title}</h2>
            <dl class="kc-profile-summary__list">
                <#list profile.attributes as attribute>
                    <#assign label = (advancedMsg(attribute.displayName!'')!'')?trim>
                    <#if !label?has_content>
                        <#assign label = attribute.name>
                    </#if>
                    <#assign value = "">
                    <#if attribute.values?has_content>
                        <#assign value = attribute.values?join(", ")>
                    <#elseif attribute.value?has_content>
                        <#assign value = attribute.value>
                    <#elseif attribute.defaultValue?has_content>
                        <#assign value = attribute.defaultValue>
                    <#else>
                        <#assign value = "-">
                    </#if>
                    <dt class="kc-profile-summary__label">${kcSanitize(label)?no_esc}</dt>
                    <dd class="kc-profile-summary__value">${kcSanitize(value)?no_esc}</dd>
                </#list>
            </dl>
        </div>
    </#if>
</#macro>

<#import "template.ftl" as layout>
<#import "user-profile-commons.ftl" as userProfileCommons>
<#import "profile-summary.ftl" as profileSummary>

<@layout.registrationLayout displayMessage=messagesPerField.exists('global') displayRequiredFields=true; section>
    <#if section = "header">
        Профиль пользователя
    <#elseif section = "form">

        <div class="kc-page">
            <div class="kc-card kc-animate-in">
                <div class="kc-card__header">
                    <h1 class="kc-card__title">Проверьте и обновите профиль</h1>
                    <p class="kc-card__subtitle">
                        Укажите актуальные данные. Поля со звёздочкой обязательны.
                    </p>
                </div>

                <form id="kc-update-profile-form"
                      class="${properties.kcFormClass!} kc-form"
                      action="${url.loginAction}" method="post">

                    <div class="kc-form__fields">
                        <@userProfileCommons.userProfileFormFields/>
                    </div>

                    <div class="kc-divider"></div>

                    <div class="kc-summary kc-animate-in-delayed">
                        <@profileSummary.profileSummary title="Текущий профиль" />
                    </div>

                    <div class="${properties.kcFormGroupClass!} kc-form__actions">
                        <div id="kc-form-options" class="${properties.kcFormOptionsClass!}">
                            <div class="${properties.kcFormOptionsWrapperClass!}">
                                <#-- можно добавить подсказки/ссылки при необходимости -->
                            </div>
                        </div>

                        <div id="kc-form-buttons" class="${properties.kcFormButtonsClass!} kc-buttons">
                            <#if isAppInitiatedAction??>
                                <input class="${properties.kcButtonClass!} ${properties.kcButtonPrimaryClass!} ${properties.kcButtonLargeClass!} kc-btn kc-btn--primary"
                                       type="submit" value="Сохранить" />
                                <button class="${properties.kcButtonClass!} ${properties.kcButtonDefaultClass!} ${properties.kcButtonLargeClass!} kc-btn kc-btn--ghost"
                                        type="submit" name="cancel-aia" value="true" formnovalidate>
                                    Отмена
                                </button>
                            <#else>
                                <input class="${properties.kcButtonClass!} ${properties.kcButtonPrimaryClass!} ${properties.kcButtonBlockClass!} ${properties.kcButtonLargeClass!} kc-btn kc-btn--primary kc-btn--block"
                                       type="submit" value="Сохранить" />
                            </#if>
                        </div>
                    </div>
                </form>
            </div>
        </div>

    </#if>
</@layout.registrationLayout>

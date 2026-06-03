import { Flex, Typography } from "../components/ui.jsx";
import PageLayout from "../components/PageLayout";
import { appConfig } from "../config.js";

export default function PersonalDataConsent() {
    const personalDataConsentUrl = appConfig.personalDataConsentUrl;

    return (
        <PageLayout headerTitle="Согласие на обработку персональных данных"
            showBottom
        >
            <Flex direction="column" gap={12} className="card legalCard">
                <Typography.Label>
                    Согласие на обработку персональных данных опубликовано на сайте клиники.
                </Typography.Label>
                {personalDataConsentUrl ? (
                    <a
                        href={personalDataConsentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="legalLink"
                    >
                        Открыть согласие на сайте клиники
                    </a>
                ) : (
                    <Typography.Label className="authErrorLabel">
                        Ссылка на согласие не настроена.
                    </Typography.Label>
                )}
            </Flex>
        </PageLayout>
    );
}

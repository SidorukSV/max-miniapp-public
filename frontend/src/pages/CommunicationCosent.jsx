import { Flex, Typography } from "../components/ui.jsx";
import PageLayout from "../components/PageLayout.jsx";
import { appConfig } from "../config.js";

export default function CommunicationConsent() {
    const communicationConsentUrl = appConfig.communicationConsentUrl;
    
    return (
        <PageLayout headerTitle="Согласие на коммуникацию"
            showBottom
        >
            <Flex direction="column" gap={12} className="card legalCard">
                <Typography.Label>
                    Согласие на коммуникацию размещено на сайте клиники.
                </Typography.Label>
                {communicationConsentUrl ? (
                    <a
                        href={communicationConsentUrl}
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

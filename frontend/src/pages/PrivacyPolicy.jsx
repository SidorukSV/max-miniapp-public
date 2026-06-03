import { Flex, Typography } from "../components/ui.jsx";
import PageLayout from "../components/PageLayout";
import { appConfig } from "../config.js";

export default function PrivacyPolicy() {
    const privacyPolicyUrl = appConfig.privacyPolicyUrl;

    return (
        <PageLayout headerTitle="Политика обработки персональных данных"
            showBottom
        >
            <Flex direction="column" gap={12} className="card legalCard">
                <Typography.Label>
                    Политика обработки персональных данных размещена на сайте клиники.
                </Typography.Label>
                {privacyPolicyUrl ? (
                    <a
                        href={privacyPolicyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="legalLink"
                    >
                        Открыть политику на сайте клиники
                    </a>
                ) : (
                    <Typography.Label className="authErrorLabel">
                        Ссылка на политику не настроена.
                    </Typography.Label>
                )}
            </Flex>
        </PageLayout>
    );
}

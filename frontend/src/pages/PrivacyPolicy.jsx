import { Flex, Typography } from "../components/ui.jsx";
import PageLayout from "../components/PageLayout";

const PRIVACY_POLICY_URL = "https://aldenta.ru/confidentiality/";

export default function PrivacyPolicy() {
    return (
        <PageLayout headerTitle="Политика обработки персональных данных"
            showBottom
        >
            <Flex direction="column" gap={12} className="card legalCard">
                <Typography.Label>
                    Политика обработки персональных данных размещена на сайте клиники.
                </Typography.Label>
                <a
                    href={PRIVACY_POLICY_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="legalLink"
                >
                    Открыть политику на сайте aldenta.ru
                </a>
            </Flex>
        </PageLayout>
    );
}

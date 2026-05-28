import { Flex, Typography } from "@maxhub/max-ui";
import PageLayout from "../components/PageLayout";
import { useNavigate } from "react-router-dom";

const PRIVACY_POLICY_URL = "https://aldenta.ru/confidentiality/";

export default function PrivacyPolicy() {
    const nav = useNavigate();

    return (
        <PageLayout headerTitle="Политика обработки персональных данных"
            showBottom={true}
            bottomButtonText="Вернуться на главную"
            onBottomButtonClick={() => { nav("/") }}
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

import { Flex, Typography } from "@maxhub/max-ui";
import PageLayout from "../components/PageLayout";
import { useNavigate } from "react-router-dom";

const CONSENT_URL = "https://aldenta.ru/personal-data-consent/";

export default function PersonalDataConsent() {
    const nav = useNavigate();
    
    return (
        <PageLayout headerTitle="Согласие на обработку персональных данных"
            showBottom={true}
            bottomButtonText="Вернуться на главную"
            onBottomButtonClick={() => { nav("/") }}
        >
            <Flex direction="column" gap={12} className="card legalCard">
                <Typography.Label>
                    Согласие на обработку персональных данных опубликовано на сайте клиники.
                </Typography.Label>
                <a
                    href={CONSENT_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="legalLink"
                >
                    Открыть согласие на сайте aldenta.ru
                </a>
            </Flex>
        </PageLayout>
    );
}

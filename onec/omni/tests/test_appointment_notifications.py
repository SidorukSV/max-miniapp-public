"""Execute the actual pure BSL scheduling/formatting code with OneScript.

This verifies calendar boundaries without connecting to 1C or sending messages.
The platform build separately checks integration with the UMC configuration.
"""
import re
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path


SOURCE = next((Path(__file__).resolve().parents[1] / "src" / "extension").iterdir())


def function_source(path, name):
    source = path.read_text(encoding="utf-8-sig")
    match = re.search(rf"(?m)^Функция {re.escape(name)}\(.*?^КонецФункции", source, re.S)
    if not match:
        raise AssertionError(f"Function not found: {name}")
    return match.group().replace(" Экспорт", "")


@unittest.skipUnless(shutil.which("oscript"), "OneScript is required")
class AppointmentNotifications(unittest.TestCase):
    def run_bsl(self, source, assertions):
        with tempfile.TemporaryDirectory(prefix="omni-notifications-") as temp:
            path = Path(temp) / "test.os"
            path.write_text(source + "\n" + assertions + '\nСообщить("PASS");\n', encoding="utf-8-sig")
            result = subprocess.run(
                [shutil.which("oscript"), "-encoding=utf-8", str(path)],
                stdout=subprocess.PIPE, stderr=subprocess.STDOUT, timeout=30,
            )
            output = result.stdout.decode("utf-8", errors="replace")
            self.assertEqual(result.returncode, 0, output)
            self.assertIn("PASS", output)

    def test_confirmation_window(self):
        source = function_source(
            SOURCE / "CommonModules/бит_омни_РассылкиMAXСервер/Ext/Module.bsl",
            "бит_ДатаЗапросаПодтвержденияMAX",
        )
        self.run_bsl(source, '''
ТекущаяДата = Дата(2026, 10, 14, 12, 0, 0);
Если бит_ДатаЗапросаПодтвержденияMAX(Дата(2026, 10, 14, 18), ТекущаяДата) <> Неопределено Тогда
    ВызватьИсключение "Same day must not request confirmation";
КонецЕсли;
Если бит_ДатаЗапросаПодтвержденияMAX(ТекущаяДата, ТекущаяДата) <> Неопределено Тогда
    ВызватьИсключение "Started appointment";
КонецЕсли;
Если бит_ДатаЗапросаПодтвержденияMAX(Дата(2026, 10, 13, 18), ТекущаяДата) <> Неопределено Тогда
    ВызватьИсключение "Past appointment";
КонецЕсли;
Если бит_ДатаЗапросаПодтвержденияMAX(Дата(2026, 10, 15, 10), ТекущаяДата) <> ТекущаяДата Тогда
    ВызватьИсключение "Tomorrow less than 24 hours must request now";
КонецЕсли;
Если бит_ДатаЗапросаПодтвержденияMAX(Дата(2026, 10, 15, 12), ТекущаяДата) <> ТекущаяДата Тогда
    ВызватьИсключение "Exact 24 hours";
КонецЕсли;
Если бит_ДатаЗапросаПодтвержденияMAX(Дата(2026, 10, 17, 15), ТекущаяДата) <> Дата(2026, 10, 16, 15) Тогда
    ВызватьИсключение "Future request must be 24 hours before";
КонецЕсли;
Если бит_ДатаЗапросаПодтвержденияMAX(Дата(2026, 10, 15, 0, 5), Дата(2026, 10, 14, 23, 55)) <> Дата(2026, 10, 14, 23, 55) Тогда
    ВызватьИсключение "Calendar midnight boundary";
КонецЕсли;
// Recalculate after moving the appointment; the old due time must not survive.
Если бит_ДатаЗапросаПодтвержденияMAX(Дата(2026, 10, 19, 9), ТекущаяДата) <> Дата(2026, 10, 18, 9) Тогда
    ВызватьИсключение "Rescheduled request";
КонецЕсли;
''')

    def test_russian_appointment_representation(self):
        path = SOURCE / "Catalogs/бит_омни_ШаблоныСообщений/Ext/ManagerModule.bsl"
        source = function_source(path, "ЗначениеКонтекстаПоИмени") + "\n" + function_source(path, "бит_ДатаВремяПриемаMAX")
        self.run_bsl(source, '''
Контекст = Новый Структура("appointment_date", Дата(2026, 10, 15, 9, 5));
Если бит_ДатаВремяПриемаMAX(Контекст) <> "15 октября 2026, Чт 09:05" Тогда
    ВызватьИсключение "Date must contain Russian month, weekday and padded time: " + бит_ДатаВремяПриемаMAX(Контекст);
КонецЕсли;
Контекст = Новый Структура("ДатаНачалаПосле", Дата(2026, 12, 31, 23, 59));
Если бит_ДатаВремяПриемаMAX(Контекст) <> "31 декабря 2026, Чт 23:59" Тогда
    ВызватьИсключение "Legacy context alias";
КонецЕсли;
Если бит_ДатаВремяПриемаMAX(Новый Структура) <> "" Тогда
    ВызватьИсключение "Missing date must be empty";
КонецЕсли;
''')


if __name__ == "__main__":
    unittest.main()

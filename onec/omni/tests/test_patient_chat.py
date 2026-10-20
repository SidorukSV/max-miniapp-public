"""Execute chat selection helpers; UI fixtures are not a live 1C form."""
import re
import unittest

from test_appointment_notifications import SOURCE, function_source
import test_mailing_schemas


class PatientChat(unittest.TestCase):
    run_bsl = test_mailing_schemas.MailingSchemas.run_bsl

    def test_search_phone_and_patient_labels(self):
        module = SOURCE / "DataProcessors/бит_омни_ЕдиныйЧат/Forms/Форма/Ext/Form/Module.bsl"
        source = "\n".join(function_source(module, name) for name in (
            "ТелефонДляПоискаКлиента", "ПредставлениеПациентаДляВыбора"))
        self.run_bsl(source, '''
Если ТелефонДляПоискаКлиента("+7 (900) 123-08-32") <> "9001230832"
    Или ТелефонДляПоискаКлиента("8 900 123 08 32") <> "9001230832"
    Или ТелефонДляПоискаКлиента("9001230832") <> "9001230832"
    Или ТелефонДляПоискаКлиента("") <> ""
    Или ТелефонДляПоискаКлиента("+375 (29) 123-45-67") <> "375291234567" Тогда
    ВызватьИсключение "Phone search must strip Russian prefix only and preserve other country codes";
КонецЕсли;
Если ПредставлениеПациентаДляВыбора("Иванов Иван Иванович", '20000229')
    <> "Иванов Иван Иванович, 29.02.2000" Тогда
    ВызватьИсключение "Namesakes need a visible date of birth";
КонецЕсли;
Если ПредставлениеПациентаДляВыбора("Иванов Иван Иванович", '00010101')
    <> "Иванов Иван Иванович, дата рождения не указана" Тогда
    ВызватьИсключение "An absent date must not render the year 0001";
КонецЕсли;
''', {})

    def test_suggestions_keep_manual_search_and_passed_phone_visible(self):
        module = SOURCE / "DataProcessors/бит_омни_ЕдиныйЧат/Forms/Форма/Ext/Form/Module.bsl"
        text = module.read_text(encoding="utf-8-sig")
        methods = []
        for name in ("ПациентДляПривязкиАвтоПодбор", "ПоказатьТелефонКонтактаНаСервере"):
            match = re.search(rf"(?m)^Процедура {name}\(.*?^КонецПроцедуры", text, re.S)
            self.assertIsNotNone(match)
            methods.append(match.group())
        source = "Перем ТелефонКонтактаMAX, Элементы;\n" + "\n".join(methods)
        self.run_bsl(source, '''
Список = Новый СписокЗначений;
Список.Добавить("patient1", "Иванов Иван Иванович, 01.01.1990");
Список.Добавить("patient2", "Иванов Иван Иванович, 02.02.2000");
Поле = Новый Структура("СписокВыбора", Список);
Данные = Неопределено;
СтандартнаяОбработка = Истина;
ПациентДляПривязкиАвтоПодбор(Поле, "", Данные, Неопределено, 0, СтандартнаяОбработка);
Если СтандартнаяОбработка Или Данные.Количество() <> 2
    Или Данные[1].Представление <> "Иванов Иван Иванович, 02.02.2000" Тогда
    ВызватьИсключение "Empty field must offer all phone candidates with distinct labels";
КонецЕсли;
Данные.Очистить();
Если Список.Количество() <> 2 Тогда ВызватьИсключение "Choice must not mutate saved suggestions"; КонецЕсли;
СтандартнаяОбработка = Истина;
Данные = Неопределено;
ПациентДляПривязкиАвтоПодбор(Поле, "Петров", Данные, Неопределено, 1, СтандартнаяОбработка);
Если Не СтандартнаяОбработка Или Данные <> Неопределено Тогда
    ВызватьИсключение "Manual search for an unrelated patient must stay standard";
КонецЕсли;
Список.Очистить();
ПациентДляПривязкиАвтоПодбор(Поле, "", Данные, Неопределено, 0, СтандартнаяОбработка);
Если Не СтандартнаяОбработка Тогда ВызватьИсключение "No candidates must preserve standard choice"; КонецЕсли;
Элементы = Новый Структура("НадписьТелефон", Новый Структура("Заголовок", "card_phone"));
ТелефонКонтактаMAX = "";
ПоказатьТелефонКонтактаНаСервере();
Если Элементы.НадписьТелефон.Заголовок <> "card_phone" Тогда
    ВызватьИсключение "Card phone must remain when no MAX phone was passed";
КонецЕсли;
ТелефонКонтактаMAX = "+79001230832";
ПоказатьТелефонКонтактаНаСервере();
Если Элементы.НадписьТелефон.Заголовок <> "+79001230832 (MAX)" Тогда
    ВызватьИсключение "Passed phone must be visible even without a linked patient";
КонецЕсли;
''', {})


if __name__ == "__main__":
    unittest.main()

"""Run patient-choice BSL with isolated OneScript fixtures; no database or MAX IO."""
import re
import shutil
import unittest

from test_appointment_notifications import function_source
from test_unlinked_contact_prompt import MODULE
import test_mailing_schemas


def procedure_source(name):
    source = MODULE.read_text(encoding="utf-8-sig")
    return re.search(rf"(?ms)^Процедура {name}\(.*?^КонецПроцедуры", source).group()


PATIENT_FIXTURE = '''
Перем ДатаРождения Экспорт;
Перем UUID Экспорт;
Функция УникальныйИдентификатор() Экспорт
    Возврат UUID;
КонецФункции
Процедура ОбработкаПолученияПредставления(Представление, СтандартнаяОбработка)
    Представление = "Иванов Иван Иванович";
    СтандартнаяОбработка = Ложь;
КонецПроцедуры
ДатаРождения = Дата(1980, 2, 3);
UUID = "11111111-1111-1111-1111-111111111111";
'''


@unittest.skipUnless(shutil.which("oscript"), "OneScript is required")
class PatientSelection(unittest.TestCase):
    run_bsl = test_mailing_schemas.MailingSchemas.run_bsl

    def test_choice_labels_birthdays_and_keyboard_paging(self):
        self.run_bsl(function_source(MODULE, "ПараметрыВыбораПациентаMAX"), '''
Клиенты = Новый Массив;
Для Индекс = 1 По 60 Цикл
    Клиенты.Добавить(Новый ПациентФикстура);
КонецЦикла;
Меню = ПараметрыВыбораПациентаMAX(Клиенты, "nonce");
Ряды = Меню.attachments[0].payload.buttons;
Если Ряды.Количество() <> 30 Или Ряды[29].Количество() <> 1 Тогда
    ВызватьИсключение "First page must contain 29 patients and next button";
КонецЕсли;
Если Ряды[0][0].text <> "Иванов Иван Иванович, 03.02.1980"
    Или Ряды[0][0].payload <> "patient:nonce:11111111-1111-1111-1111-111111111111" Тогда
    ВызватьИсключение "Patient callback must include identity and display FIO and DOB";
КонецЕсли;
Меню = ПараметрыВыбораПациентаMAX(Клиенты, "nonce", 1);
Ряды = Меню.attachments[0].payload.buttons;
Если Ряды.Количество() <> 30 Или Ряды[29].Количество() <> 2 Тогда
    ВызватьИсключение "Middle page must have previous and next buttons";
КонецЕсли;
Меню = ПараметрыВыбораПациентаMAX(Клиенты, "nonce", 100);
Ряды = Меню.attachments[0].payload.buttons;
Если Ряды.Количество() <> 3 Или Ряды[2].Количество() <> 1 Тогда
    ВызватьИсключение "Last page must clamp index and contain final patients plus previous";
КонецЕсли;
Клиенты = Новый Массив;
Пациент = Новый ПациентФикстура;
Пациент.ДатаРождения = Дата(1, 1, 1);
Клиенты.Добавить(Пациент);
Меню = ПараметрыВыбораПациентаMAX(Клиенты, "nonce");
Если Меню.attachments[0].payload.buttons[0][0].text <> "Иванов Иван Иванович, дата рождения не указана" Тогда
    ВызватьИсключение "Empty DOB must not display 01.01.0001";
КонецЕсли;
''', {"ПациентФикстура": PATIENT_FIXTURE})

    def test_callback_requires_fresh_phone_membership_and_nonce_and_is_idempotent(self):
        source = '''Перем ХешФункция, Клиенты, История, ВТранзакции;
''' + function_source(MODULE, "ВыполнитьВыборПациентаMAX").replace("Новый ХешированиеДанных(", "Новый ХешированиеДанныхФикстура(").replace("Base64Строка(", "Base64Фикстура(") + '''
Процедура НачатьТранзакцию()
    ВТранзакции = Истина;
КонецПроцедуры
Процедура ЗафиксироватьТранзакцию()
    ВТранзакции = Ложь;
КонецПроцедуры
Процедура ОтменитьТранзакцию()
    ВТранзакции = Ложь;
КонецПроцедуры
Процедура ЗаблокироватьКонтактДляВыбораMAX(Контакт)
    Если Не ВТранзакции Тогда ВызватьИсключение "Missing transaction lock"; КонецЕсли;
КонецПроцедуры
Функция ПациентыПоТелефонуMAX(Телефон)
    Если Телефон <> "+79991234567" Тогда ВызватьИсключение "Must requery verified phone"; КонецЕсли;
    Возврат Клиенты;
КонецФункции
Функция Base64Фикстура(Данные)
    Возврат Данные;
КонецФункции
Функция СообщениеЧатаУжеЗаписаноMAX(Идентификатор, Контакт, Бот, Входящее)
    Возврат История.Найти(Идентификатор) <> Неопределено;
КонецФункции
Процедура ЗаписатьКонтактВыбораMAX(Объект)
    Объект.Записи = Объект.Записи + 1;
КонецПроцедуры
Процедура ЗаписатьСообщениеЧатаMAX(Идентификатор, Контакт, Бот, Входящее, Текст, Вид, Автор, Статус, Ошибка, Вложения)
    Если Вид <> "contact_action" Или Не Входящее Тогда ВызватьИсключение "Must log patient's selection"; КонецЕсли;
    История.Добавить(Идентификатор);
КонецПроцедуры
'''
        fixtures = {
            "ПациентФикстура": PATIENT_FIXTURE,
            "ХешированиеДанныхФикстура": '''
Перем ХешСумма Экспорт;
Процедура Добавить(Значение) Экспорт
    ХешСумма = Значение;
КонецПроцедуры
Процедура ПриСозданииОбъекта(Алгоритм)
КонецПроцедуры
''',
            "КонтактФикстура": '''
Перем Объект Экспорт;
Функция ПолучитьОбъект() Экспорт
    Возврат Объект;
КонецФункции
Объект = Новый Структура("Бот,Заблокирован,ПометкаУдаления,ТелефонMAX,ВыборПациентаMAX,Получатель,Записи",
    "bot", Ложь, Ложь, "+79991234567", "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", "operator", 0);
''',
        }
        self.run_bsl(source, '''
ХешФункция = Новый Структура("SHA256", "sha256");
Клиенты = Новый Массив;
История = Новый Массив;
Клиент = Новый ПациентФикстура;
Клиенты.Добавить(Клиент);
Контакт = Новый КонтактФикстура;
Префикс = "patient:aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa:";
Результат = ВыполнитьВыборПациентаMAX(Префикс + "22222222-2222-2222-2222-222222222222", "bad", Контакт, "bot");
Если Результат.Успех Или Контакт.Объект.Получатель <> "operator" Тогда
    ВызватьИсключение "Forged unrelated patient must be rejected";
КонецЕсли;
Контакт.Объект.ВыборПациентаMAX = "";
Результат = ВыполнитьВыборПациентаMAX(Префикс + Клиент.UUID, "stale", Контакт, "bot");
Если Результат.Успех Тогда ВызватьИсключение "Old menu after manual binding must be rejected"; КонецЕсли;
Контакт.Объект.ВыборПациентаMAX = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
Результат = ВыполнитьВыборПациентаMAX(Префикс + Клиент.UUID, "valid", Контакт, "bot");
Если Не Результат.Успех Или Контакт.Объект.Получатель <> Клиент
    Или Контакт.Объект.ВыборПациентаMAX <> "" Или Контакт.Объект.Записи <> 1 Или История.Количество() <> 1 Тогда
    ВызватьИсключение "Valid explicit choice must switch existing binding once and consume nonce";
КонецЕсли;
Результат = ВыполнитьВыборПациентаMAX(Префикс + Клиент.UUID, "valid", Контакт, "bot");
Если Контакт.Объект.Записи <> 1 Или История.Количество() <> 1 Или ВТранзакции Тогда
    ВызватьИсключение "Duplicate callback must not switch or log twice";
КонецЕсли;
Контакт.Объект.ВыборПациентаMAX = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
Клиенты.Очистить();
Результат = ВыполнитьВыборПациентаMAX(Префикс + Клиент.UUID, "removed", Контакт, "bot");
Если Результат.Успех Тогда ВызватьИсключение "Removed phone membership must invalidate existing menu"; КонецЕсли;
Контакт.Объект.Бот = "otherbot";
Клиенты.Добавить(Клиент);
Результат = ВыполнитьВыборПациентаMAX(Префикс + Клиент.UUID, "foreign", Контакт, "bot");
Если Результат.Успех Тогда ВызватьИсключение "Another bot must not change binding"; КонецЕсли;
''', fixtures)

    def test_phone_persistence_is_after_proof_and_multi_match_has_separate_choice(self):
        source = procedure_source("ОбработатьПолученныйКонтактMAX")
        self.assertLess(source.index("Контакт принадлежит другому пользователю MAX"), source.index("СохранитьПодтвержденныйТелефонMAX"))
        self.assertLess(source.index("Не подтверждена подпись контакта MAX"), source.index("СохранитьПодтвержденныйТелефонMAX"))
        self.assertIn("Если Клиенты.Количество() > 1 Тогда", source)
        self.assertNotIn("Найдено несколько клиентов", source)
        self.assertIn('НРег(ИмяКоманды) = "patient"', procedure_source("ОбработатьКоманду"))

    def test_historical_phone_requires_signature_and_same_max_owner(self):
        source = "\n".join(function_source(MODULE, name) for name in (
            "ТелефонПодписанногоВложенияMAX", "ЗначениеСвойства", "СтроковоеСвойство",
            "СтрокаИдентификатора", "НормализоватьVCFMAX", "НомерТелефонаИзVCFMAX", "ХешиРавныMAX")) + '''
Функция HMACSHA256MAX(Токен, VCF)
    Если Токен = "current-token" Тогда Возврат "good"; КонецЕсли;
    Возврат "rotated";
КонецФункции
'''
        self.run_bsl(source, '''
VCF = "BEGIN:VCARD" + Символы.ПС + "TEL;TYPE=CELL:+79991234567" + Символы.ПС + "END:VCARD" + Символы.ПС;
Данные = Новый Структура("max_info,vcf_info,hash", Новый Структура("user_id", 30300503), VCF, "good");
Если ТелефонПодписанногоВложенияMAX(Данные, 30300503, "current-token") <> "+79991234567" Тогда
    ВызватьИсключение "Valid historical own signed contact must restore phone";
КонецЕсли;
Если Не ПустаяСтрока(ТелефонПодписанногоВложенияMAX(Данные, 30300504, "current-token")) Тогда
    ВызватьИсключение "Another contact's signed VCard must not be accepted";
КонецЕсли;
Если Не ПустаяСтрока(ТелефонПодписанногоВложенияMAX(Данные, 30300503, "rotated-token")) Тогда
    ВызватьИсключение "Historical phone signed by old token must be re-requested";
КонецЕсли;
Данные.hash = "";
Если Не ПустаяСтрока(ТелефонПодписанногоВложенияMAX(Данные, 30300503, "current-token")) Тогда
    ВызватьИсключение "Unsigned history is not evidence of verified phone";
КонецЕсли;
''')

    def test_patient_command_requests_phone_or_offers_explicit_choice(self):
        source = "Перем Телефон, Клиенты, Запросы, Меню, Тексты;\n" + procedure_source("ПредложитьВыборПациентаMAX") + '''
Функция ТелефонКонтактаMAX(Контакт, Бот)
    Возврат Телефон;
КонецФункции
Функция ПациентыПоТелефонуMAX(Номер)
    Возврат Клиенты;
КонецФункции
Процедура ЗапроситьТелефонНепривязанногоКонтактаMAX(Контакт, Бот, Принудительно)
    Если Не Принудительно Тогда ВызватьИсключение "Explicit command must permit another phone request"; КонецЕсли;
    Запросы = Запросы + 1;
КонецПроцедуры
Процедура ОтправитьВыборПациентаMAX(Контакт, Бот, Карточки)
    Меню = Меню + 1;
КонецПроцедуры
Процедура ОтправитьТекстовоеСообщение(Текст, Контакт, Бот)
    Тексты = Тексты + 1;
КонецПроцедуры
'''
        self.run_bsl(source, '''
Телефон = "";
Клиенты = Новый Массив;
Запросы = 0;
Меню = 0;
Тексты = 0;
ПредложитьВыборПациентаMAX("contact", "bot");
Если Запросы <> 1 Или Меню <> 0 Тогда ВызватьИсключение "Unknown phone must request own contact"; КонецЕсли;
Телефон = "+79991234567";
ПредложитьВыборПациентаMAX("contact", "bot");
Если Тексты <> 1 Или Меню <> 0 Тогда ВызватьИсключение "Missing patient must inform user"; КонецЕсли;
Клиенты.Добавить("patient1");
ПредложитьВыборПациентаMAX("contact", "bot");
Клиенты.Добавить("patient2");
ПредложитьВыборПациентаMAX("contact", "bot");
Если Меню <> 2 Или Запросы <> 1 Тогда ВызватьИсключение "Known phone must offer buttons even for one patient"; КонецЕсли;
''')


if __name__ == "__main__":
    unittest.main()

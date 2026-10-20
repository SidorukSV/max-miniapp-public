"""Guard syntax that OneScript accepts but the deployed 1C platform rejects."""
import re
import unittest

from test_appointment_notifications import SOURCE


def constructor_accesses(source):
    # Mask strings and comments while preserving offsets and line numbers.
    masked = list(source)
    i = 0
    in_string = False
    while i < len(source):
        if in_string:
            masked[i] = " " if source[i] not in "\r\n" else source[i]
            if source[i] == '"':
                if i + 1 < len(source) and source[i + 1] == '"':
                    masked[i + 1] = " "
                    i += 2
                    continue
                in_string = False
        elif source.startswith("//", i):
            while i < len(source) and source[i] not in "\r\n":
                masked[i] = " "
                i += 1
            continue
        elif source[i] == '"':
            in_string = True
            masked[i] = " "
        i += 1

    code = "".join(masked)
    lines = []
    for match in re.finditer(r"\bНовый\s*(?:\w+\s*)?\(", code, re.IGNORECASE):
        depth = 1
        i = match.end()
        while i < len(code) and depth:
            if code[i] == "(":
                depth += 1
            elif code[i] == ")":
                depth -= 1
            i += 1
        while i < len(code) and code[i].isspace():
            i += 1
        if depth == 0 and i < len(code) and code[i] == ".":
            lines.append(source.count("\n", 0, match.start()) + 1)
    return lines


class PlatformSyntax(unittest.TestCase):
    def test_reproduced_constructor_access_is_rejected(self):
        self.assertEqual(constructor_accesses(
            "Возврат Новый ХранилищеЗначения(ЗначениеСхемы).Получить();"), [1])
        self.assertEqual(constructor_accesses(
            "Хранилище = Новый ХранилищеЗначения(ЗначениеСхемы);\n"
            "Возврат Хранилище.Получить();"), [])
        self.assertEqual(constructor_accesses(
            "Возврат Новый ХранилищеЗначения(Функция(Значение))\n.Получить();"), [1])

    def test_strings_comments_and_regular_calls_are_ignored(self):
        self.assertEqual(constructor_accesses(
            '// Новый ХранилищеЗначения(X).Получить();\n'
            'Текст = "Новый ХранилищеЗначения(X).Получить()";\n'
            'Выборка = Запрос.Выполнить().Выбрать();'), [])

    def test_extension_has_no_direct_constructor_access(self):
        errors = []
        for path in SOURCE.rglob("*.bsl"):
            for line in constructor_accesses(path.read_text(encoding="utf-8-sig")):
                errors.append(f"{path.relative_to(SOURCE)}:{line}")
        self.assertEqual(errors, [], "Store constructor result in a variable first")


if __name__ == "__main__":
    unittest.main()

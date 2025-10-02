import json
import re
from datetime import datetime, timedelta
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, Any, Optional, List, Tuple

app = FastAPI()


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def extract_json_from_text(text:str) -> List[Dict[str,Any]]:
    """
    Универсальный поиск JSON объектов в тексте с различными методами
    """
    json_objects = []

    # Метод 1: Поиск с помощью регулярных выражений (основной метод)
    json_patterns = [
        r'\{[^{}]*?(?:\{[^{}]*\}[^{}]*)*\}',  # Вложенные объекты
        r'\[[^\[\]]*?(?:\[[^\[\]]*\][^\[\]]*)*\]',  # Массивы
        r'\{(?:[^{}]|(?:\{[^{}]*\}))*\}',  # Улучшенный для вложенных структур
    ]

    for pattern in json_patterns:
        matches = re.finditer(pattern, text, re.DOTALL)
        for match in matches:
            try:
                json_obj = json.loads(match.group())
                json_objects.append(json_obj)
            except (json.JSONDecodeError, UnicodeDecodeError):
                continue
    # Метод 2: Поиск JSON-подобных структур по границам
    lines = text.splitlines()
    json_candidates = []
    current_object = []
    in_object = False
    brace_count = 0
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
            
        # Начало JSON объекта
        if line.startswith('{') and not in_object:
            in_object = True
            current_object = [line]
            brace_count = line.count('{') - line.count('}')
        elif in_object:
            current_object.append(line)
            brace_count += line.count('{') - line.count('}')
            
            # Конец JSON объекта
            if brace_count == 0:
                json_candidates.append('\n'.join(current_object))
                in_object = False
                current_object = []
    # Парсинг кандидатов
    for candidate in json_candidates:
        try:
            json_obj = json.loads(candidate)
            json_objects.append(json_obj)
        except (json.JSONDecodeError, UnicodeDecodeError):
            continue
    
    # Метод 3: Поиск по ключевым словам (для частичных JSON)
    terraform_keywords = ['resource_changes', 'planned_values', 'terraform_version', 'configuration']
    for keyword in terraform_keywords:
        if keyword in text:
            # Ищем объект содержащий ключевое слово
            start_idx = max(0, text.find(keyword) - 1000)  # 1000 символов назад
            end_idx = min(len(text), text.find(keyword) + 10000)  # 10000 символов вперед
            
            context = text[start_idx:end_idx]
            # Ищем JSON в контексте
            context_matches = re.finditer(r'\{[^{}]*?(?:\{[^{}]*\}[^{}]*)*\}', context, re.DOTALL)
            for match in context_matches:
                try:
                    json_obj = json.loads(match.group())
                    if keyword in str(json_obj):
                        json_objects.append(json_obj)
                except (json.JSONDecodeError, UnicodeDecodeError):
                    continue
    
    # Метод 4: Поиск многострочных JSON объектов
    multiline_pattern = r'\{[\s\S]*?\}'
    multiline_matches = re.finditer(multiline_pattern, text, re.MULTILINE | re.DOTALL)
    for match in multiline_matches:
        candidate = match.group()
        # Проверяем что это сбалансированные скобки
        if candidate.count('{') == candidate.count('}'):
            try:
                json_obj = json.loads(candidate)
                json_objects.append(json_obj)
            except (json.JSONDecodeError, UnicodeDecodeError):
                continue
    
    # Удаляем дубликаты (на основе строкового представления)
    unique_objects = []
    seen = set()
    for obj in json_objects:
        obj_str = json.dumps(obj, sort_keys=True)
        if obj_str not in seen:
            seen.add(obj_str)
            unique_objects.append(obj)
    
    return unique_objects

def extract_plan_or_log(text: str) -> Dict[str, Any]:
    """
    Универсальный парсер с улучшенной обработкой ошибок
    """
    # Парсинг всего файла как JSON
    try:
        obj = json.loads(text)
        if "resource_changes" in obj or "planned_values" in obj:
            return obj
        if "diagnostic" in str(obj.get('@message', '')).lower():
            return {"diagnostics": [obj]}
    except Exception:
        pass  # Файл не является валидным JSON целиком

    #  Поиск JSON объектов в тексте
    objects_found = extract_json_from_text(text)

    # Проверяем найденные объекты на Terraform-specific структуры
    terraform_objects = []
    for obj in objects_found:
        if isinstance(obj, dict):
            # Проверяем на Terraform plan
            if ("resource_changes" in obj or 
                "planned_values" in obj or
                "terraform_version" in obj or
                "format_version" in obj):
                return obj  # Возвращаем сразу если нашли Terraform plan
            
            # Проверяем на диагностические сообщения
            if ("diagnostic" in str(obj.get('@message', '')).lower() or
                "error" in str(obj.get('@level', '')).lower() or
                "warning" in str(obj.get('@level', '')).lower()):
                terraform_objects.append(obj)

    # Если нашли диагностические сообщения
    if terraform_objects:
        return {"diagnostics": terraform_objects}
    
    # Поиск в построчно (дополнительный метод)
    diagnostics_found = []
    for line in text.splitlines():
        line = line.strip()
        if line and line[0] == '{' and line[-1] == '}':
            try:
                candidate = json.loads(line)
                if "diagnostic" in str(candidate.get('@message', '')).lower():
                    diagnostics_found.append(candidate)
            except Exception:
                continue
    
    if diagnostics_found:
        return {"diagnostics": diagnostics_found}
    
    # Если нашли какие-то объекты, но не нашли Terraform-specific
    if objects_found:
        # Возвращаем первый валидный JSON объект
        return{
            "objects_found":objects_found,
            "objects_count":len(objects_found),
            "message": f"Найдено {len(objects_found)} JSON объектов, но не обнаружен Terraform plan"
        }

    
    raise ValueError(f"Не удалось найти Terraform plan JSON. Найдено объектов: {len(objects_found)}, диагностик: {len(diagnostics_found)}")

def analyze_objects_for_changes(objects:List[Dict]) -> Dict[str,int]:
    """
    Анализирует найденные объекты на предмет изменений типа create, update, delete
    """
    summary = {"create":0, "update":0, "delete":0,"replace":0,"no-op":0}

    for obj in objects:
         if isinstance(obj, dict):
            # Формат Terraform plan
            if "change" in obj and "actions" in obj["change"]:
                actions = obj["change"]["actions"]
                for action in actions:
                    if action in summary:
                        summary[action] += 1
            
            # Формат с прямыми полями
            elif "action" in obj:
                action = obj["action"]
                if action in summary:
                    summary[action] += 1
            
            # Формат с type изменения
            elif "type" in obj:
                change_type = obj["type"].lower()
                if change_type in ["create", "new"]:
                    summary["create"] += 1
                elif change_type in ["update", "modify"]:
                    summary["update"] += 1
                elif change_type in ["delete", "remove"]:
                    summary["delete"] += 1
                elif change_type == "replace":
                    summary["replace"] += 1
                elif change_type in ["no-op", "noop"]:
                    summary["no-op"] += 1
            
            # Поиск ключевых слов в содержимом объекта
            obj_str = str(obj).lower()
            if "create" in obj_str or "new" in obj_str:
                summary["create"] += 1
            elif "update" in obj_str or "modify" in obj_str:
                summary["update"] += 1
            elif "delete" in obj_str or "remove" in obj_str:
                summary["delete"] += 1
            elif "replace" in obj_str:
                summary["replace"] += 1
    
    return summary

@app.post("/api/upload")
async def upload_plan(file: UploadFile = File(...)) -> Dict[str, Any]:
    if not file.filename.endswith(".json"):
        raise HTTPException(status_code=400, detail="Можно загружать только .json")

    try:
        content = await file.read()
        text = content.decode("utf-8-sig", errors="ignore")
        plan = extract_plan_or_log(text)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Некорректный JSON: {str(e)}")

    if "diagnostics" in plan:
        return{
            "terraform_version":None,
            "total_changes": 0,
            "create": 0,
            "update": 0,
            "delete": 0,
            "replace": 0,
            "no-op": 0,
            "diagnostics": plan.get("diagnostics", []),
            "parsing_result": "diagnostics_found"
        }
    if "objects_found" in plan:
        objects = plan.get("objects_found", [])
        # Анализируем объекты для поиска изменений
        changes_summary = analyze_objects_for_changes(objects)
        total_changes = sum(changes_summary.values())
        return {
            "terraform_version": None,
            "total_changes": total_changes,
            **changes_summary,
            "diagnostics": [],
            "parsing_result": "objects_found",
            "objects_count": plan.get("objects_count", 0), 
            "objects_sample": objects[:5],  # Первые 5 объектов для примера!
            "message": plan.get("message", "")
        }
    if "resource_changes" not in plan:
        changes_summary = analyze_objects_for_changes([plan])
        total_changes = sum(changes_summary.values())
        return {
            "terraform_version": plan.get("terraform_version"),
            "total_changes": total_changes,
            **changes_summary,
            "diagnostics": plan.get("diagnostics", []),
            "parsing_result": "partial_plan"
        }

    
    summary = {"create": 0, "update": 0, "delete": 0, "replace": 0, "no-op": 0}
    total = 0

    for change in plan.get("resource_changes", []):
        actions = change.get("change", {}).get("actions", [])
        total += 1

        for action in actions:
            if action in summary:
                summary[action] += 1

    return {
        "terraform_version": plan.get("terraform_version"),
        "total_changes": total,
        **summary,
        "diagnostics": plan.get("diagnostics", []),
        "parsing_result": "full_plan"
    }


@app.get("/api/health")
async def health():
    return {"ok": True}

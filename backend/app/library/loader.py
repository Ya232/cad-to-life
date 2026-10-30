import json
import os
import tempfile
from pathlib import Path

from rapidfuzz import fuzz, process

from .models import Component

LIBRARY_PATH = Path(__file__).with_name("components.json")


def _validate_component(component: Component) -> Component:
    if component.dimensions_mm is None:
        raise ValueError(f"Component {component.id} must define dimensions_mm.")
    if component.source is None:
        raise ValueError(f"Component {component.id} must define a source.")
    return component


def load_components(path: Path = LIBRARY_PATH) -> list[Component]:
    if not path.exists():
        return []
    raw = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(raw, list):
        raise ValueError("The component library must contain a JSON array.")
    return [_validate_component(Component.model_validate(item)) for item in raw]


class ComponentStore:
    def __init__(self, path: Path = LIBRARY_PATH) -> None:
        self.path = path
        self.components = load_components(path)

    def save(self) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        payload = [component.model_dump(mode="json") for component in self.components]
        fd, temporary_name = tempfile.mkstemp(
            prefix="components-",
            suffix=".json",
            dir=self.path.parent,
        )
        try:
            with os.fdopen(fd, "w", encoding="utf-8") as file:
                json.dump(payload, file, indent=2, ensure_ascii=False)
                file.write("\n")
            os.replace(temporary_name, self.path)
        finally:
            if os.path.exists(temporary_name):
                os.unlink(temporary_name)

    def list(self, search: str | None = None) -> list[Component]:
        if not search:
            return self.components
        needle = search.casefold()
        return [
            component
            for component in self.components
            if needle in component.name.casefold()
            or needle in component.id.casefold()
            or needle in component.manufacturer.casefold()
        ]

    def get(self, component_id: str) -> Component | None:
        return next((item for item in self.components if item.id == component_id), None)

    def upsert(self, component: Component) -> Component:
        for index, current in enumerate(self.components):
            if current.id == component.id:
                self.components[index] = component
                self.save()
                return component
        self.components.append(component)
        self.save()
        return component

    def delete(self, component_id: str) -> None:
        component = self.get(component_id)
        if component is None:
            raise KeyError(component_id)
        if component.verified:
            raise PermissionError("Verified components cannot be deleted.")
        self.components.remove(component)
        self.save()


component_store = ComponentStore()


def find_component(query: str, limit: int = 5) -> list[tuple[Component, float]]:
    names = {
        component.id: f"{component.name} {component.manufacturer}"
        for component in component_store.components
    }
    matches = process.extract(query, names, scorer=fuzz.WRatio, limit=limit)
    return [
        (component_store.get(component_id), float(score))
        for _, score, component_id in matches
        if component_store.get(component_id) is not None
    ]

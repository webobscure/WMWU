import { Save } from "lucide-react";
import type { FormEvent } from "react";
import { useState } from "react";
import styles from "./CollectionForm.module.css";

type Props = {
  initialTitle?: string;
  initialDescription?: string | null;
  initialTags?: string[];
  submitLabel: string;
  loading?: boolean;
  onSubmit: (input: { title: string; description?: string | null; tags: string[] }) => Promise<unknown> | unknown;
};

function parseTags(value: string) {
  return Array.from(
    new Set(
      value
        .split(/[\s,]+/)
        .map((tag) => tag.trim().replace(/^#+/, "").toLowerCase())
        .filter(Boolean)
    )
  ).slice(0, 12);
}

export function CollectionForm({
  initialTitle = "",
  initialDescription = "",
  initialTags = [],
  submitLabel,
  loading,
  onSubmit
}: Props) {
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription ?? "");
  const [tags, setTags] = useState(initialTags.map((tag) => `#${tag}`).join(" "));

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!title.trim()) {
      return;
    }

    await onSubmit({
      title: title.trim(),
      description: description.trim() || null,
      tags: parseTags(tags)
    });

    if (!initialTitle) {
      setTitle("");
      setDescription("");
      setTags("");
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <label>
        Название
        <input
          className="field"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Например, Сериалы для выходных"
        />
      </label>
      <label>
        Описание
        <textarea
          className="textarea"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Что объединяет фильмы в этой подборке"
        />
      </label>
      <label>
        Хештеги
        <input
          className="field"
          value={tags}
          onChange={(event) => setTags(event.target.value)}
          placeholder="#триллер #вечер #90е"
        />
      </label>
      <button className="buttonPrimary" type="submit" disabled={loading || !title.trim()}>
        <Save size={18} aria-hidden />
        {submitLabel}
      </button>
    </form>
  );
}

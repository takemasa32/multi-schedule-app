"use client";

import { useState } from "react";
import { createEvent } from "@/lib/actions";
import { formatDateWithDay } from "@/lib/utils";

export default function EventForm() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dates, setDates] = useState<string[]>(["", ""]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({});

  // 最小日付（今日）を設定
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const minDate = today.toISOString().split("T")[0];

  // 日程追加ボタンのハンドラ
  const handleAddDate = () => {
    setDates([...dates, ""]);
  };

  // 日程入力の変更ハンドラ
  const handleDateChange = (index: number, value: string) => {
    const newDates = [...dates];
    newDates[index] = value;
    setDates(newDates);

    // 日付フィールドのエラーをクリア
    const newFieldErrors = { ...fieldErrors };
    delete newFieldErrors[`date-${index}`];
    setFieldErrors(newFieldErrors);
  };

  // 日程削除のハンドラ
  const handleRemoveDate = (index: number) => {
    if (dates.length > 1) {
      const newDates = [...dates];
      newDates.splice(index, 1);
      setDates(newDates);

      // 削除された日付のエラーを削除
      const newFieldErrors = { ...fieldErrors };
      delete newFieldErrors[`date-${index}`];
      setFieldErrors(newFieldErrors);
    }
  };

  // フォーム送信前のバリデーション
  const validateForm = () => {
    const errors: { [key: string]: string } = {};
    let isValid = true;

    // タイトルのバリデーション
    if (!title.trim()) {
      errors["title"] = "イベントのタイトルを入力してください";
      isValid = false;
    }

    // 日程のバリデーション
    let hasValidDate = false;
    dates.forEach((date, index) => {
      if (date) {
        hasValidDate = true;
        const dateObj = new Date(date);
        if (dateObj < today) {
          errors[`date-${index}`] = "過去の日付は選択できません";
          isValid = false;
        }
      }
    });

    if (!hasValidDate) {
      errors["dates"] = "少なくとも1つの候補日程を入力してください";
      isValid = false;
    }

    setFieldErrors(errors);
    return isValid;
  };

  // フォーム送信ハンドラ
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // バリデーション
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("description", description);

      const validDates = dates.filter((date) => date.trim() !== "");
      validDates.forEach((date) => {
        formData.append("dates", date);
      });

      // Server Actionの呼び出し
      await createEvent(formData);
    } catch (err: Error | unknown) {
      console.error("送信エラー:", err);
      setError(
        err instanceof Error
          ? err.message
          : "エラーが発生しました。時間をおいて再度お試しください。"
      );
      setIsSubmitting(false);
    }
  };

  // 日時をフォーマットして表示する関数
  const formatPreviewDate = (dateString: string) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      return formatDateWithDay(date);
    } catch {
      // 日付変換エラー時は入力文字列をそのまま返す
      return dateString;
    }
  };

  return (
    <div className="card bg-base-100 shadow-xl max-w-3xl mx-auto mt-8">
      <div className="card-body">
        <h2 className="card-title text-2xl font-bold mb-6">新規イベント作成</h2>

        {error && (
          <div className="alert alert-error mb-4">
            <span>{error}</span>
          </div>
        )}

        <form action={createEvent} onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1" htmlFor="title">
              イベントタイトル *
            </label>
            <input
              type="text"
              id="title"
              className={`input input-bordered w-full ${
                fieldErrors["title"] ? "input-error" : ""
              }`}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例：チームミーティング"
              required
            />
            {fieldErrors["title"] && (
              <p className="text-error text-xs mt-1">{fieldErrors["title"]}</p>
            )}
          </div>

          <div className="mb-6">
            <label
              className="block text-sm font-medium mb-1"
              htmlFor="description"
            >
              説明（任意）
            </label>
            <textarea
              id="description"
              className="textarea textarea-bordered w-full h-24"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="イベントの詳細情報を入力してください"
            ></textarea>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">候補日程 *</label>
            {fieldErrors["dates"] && (
              <p className="text-error text-xs mb-2">{fieldErrors["dates"]}</p>
            )}
            {dates.map((date, index) => (
              <div key={index} className="mb-3">
                <div className="flex items-center mb-1">
                  <input
                    type="datetime-local"
                    className={`input input-bordered flex-1 ${
                      fieldErrors[`date-${index}`] ? "input-error" : ""
                    }`}
                    value={date}
                    onChange={(e) => handleDateChange(index, e.target.value)}
                    min={minDate}
                  />
                  <button
                    type="button"
                    className="btn btn-square btn-outline ml-2"
                    onClick={() => handleRemoveDate(index)}
                    disabled={dates.length <= 1}
                    aria-label="候補日程を削除"
                  >
                    ✕
                  </button>
                </div>
                {date && (
                  <div className="text-xs text-gray-600 ml-2">
                    {formatPreviewDate(date)}
                  </div>
                )}
                {fieldErrors[`date-${index}`] && (
                  <p className="text-error text-xs mt-1">
                    {fieldErrors[`date-${index}`]}
                  </p>
                )}
              </div>
            ))}
            <button
              type="button"
              className="btn btn-outline btn-sm mt-2"
              onClick={handleAddDate}
            >
              + 候補日程を追加
            </button>
          </div>

          <div className="card-actions justify-end">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  送信中...
                </>
              ) : (
                "イベントを作成"
              )}
            </button>
          </div>
        </form>

        <div className="text-xs text-gray-500 mt-6">
          <p>* 作成後、参加者に共有するためのリンクが発行されます。</p>
          <p className="mt-1">
            *
            候補日程は後から追加することはできませんので、必要な候補日をすべて入力してください。
          </p>
        </div>
      </div>
    </div>
  );
}

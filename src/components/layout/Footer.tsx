import Link from "next/link";
import siteConfig from "@/lib/site-config";

export default function Footer() {
  return (
    <footer className="bg-base-200 border-t border-base-300 py-8 mt-auto">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* サービス情報 */}
          <div>
            <h3 className="font-bold text-lg mb-4">{siteConfig.name.full}</h3>
            <p className="text-base-content/70 text-sm">
              グループのイベント日程調整を簡単に。
              <br />
              参加者はログイン不要で回答でき、最適な日程を素早く見つけることができます。
            </p>
          </div>

          {/* リンク集 */}
          <div>
            <h3 className="font-bold mb-4">リンク</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/" className="hover:text-primary transition">
                  ホーム
                </Link>
              </li>
              <li>
                <Link href="/create" className="hover:text-primary transition">
                  イベント作成
                </Link>
              </li>
            </ul>
          </div>

          {/* 連絡先・著作権 */}
          <div>
            <h3 className="font-bold mb-4">お問い合わせ</h3>
            <p className="text-base-content/70 text-sm mb-4">
              ご質問やフィードバックがございましたら、お気軽にご連絡ください。
            </p>
          </div>
        </div>

        {/* コピーライト */}
        <div className="border-t border-base-300 mt-6 pt-6 text-center text-sm text-base-content/60">
          &copy; {siteConfig.copyright.year} {siteConfig.copyright.holder} All
          Rights Reserved.
        </div>
      </div>
    </footer>
  );
}

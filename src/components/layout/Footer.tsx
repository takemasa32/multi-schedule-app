import Link from 'next/link';
import siteConfig from '@/lib/site-config';

export default function Footer() {
  return (
    <footer className="bg-base-200 border-base-300 mt-auto border-t py-8">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {/* サービス情報 */}
          <div>
            <h3 className="mb-4 text-lg font-bold">{siteConfig.name.full}</h3>
            <p className="text-base-content/70 text-sm">
              グループのイベント日程調整を簡単に。
              <br />
              参加者はログイン不要で回答でき、最適な日程を素早く見つけることができます。
            </p>
          </div>

          {/* リンク集 */}
          <div>
            <h3 className="mb-4 font-bold">リンク</h3>
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
              <li>
                <Link href="/history" className="hover:text-primary transition">
                  閲覧履歴
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-primary transition">
                  利用規約
                </Link>
              </li>
            </ul>
          </div>

          {/* 連絡先・著作権 */}
          {/* <div>
            <h3 className="font-bold mb-4">お問い合わせ</h3>
            <p className="text-base-content/70 text-sm mb-4">
              ご質問やフィードバックがございましたら、お気軽にご連絡ください。
            </p>
          </div> */}
        </div>

        {/* コピーライト */}
        <div className="border-base-300 text-base-content/60 mt-6 border-t pt-6 text-center text-sm">
          &copy; {siteConfig.copyright.year} {siteConfig.copyright.holder}
        </div>
      </div>
    </footer>
  );
}

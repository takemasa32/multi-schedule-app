import EventForm from '@/components/event-form';
import Link from 'next/link';

export default function CreateEventPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-8">
        <nav className="flex justify-between items-center mb-8">
          <Link href="/" className="text-2xl font-bold text-blue-600 hover:text-blue-800">
            複数日程調整アプリ
          </Link>
        </nav>
        <h1 className="text-3xl font-bold mb-2 text-center">新規イベント作成</h1>
        <p className="text-gray-600 text-center">候補日程を複数選択して、参加者に共有するイベントを作成します</p>
      </header>
      
      <EventForm />
      
      <footer className="mt-16 py-4 text-center text-sm text-gray-500">
        <p>© 2025 複数日程調整アプリ</p>
      </footer>
    </div>
  );
}
import EventForm from '@/components/event-form';
import { createEvent } from '@/lib/actions';
import { redirect } from 'next/navigation';

export default function Home() {
  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-2">複数日程調整アプリ</h1>
        <p className="text-gray-600">グループのイベント日程を簡単に調整できます</p>
      </header>
      
      <EventForm />
      
      <footer className="mt-16 py-4 text-center text-sm text-gray-500">
        <p>© 2025 複数日程調整アプリ</p>
      </footer>
    </div>
  );
}
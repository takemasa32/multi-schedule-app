import { supabaseAdmin } from '@/lib/supabase';
import { formatDateTimeWithDay } from '@/lib/utils';
import { notFound } from 'next/navigation';
import { AvailabilityForm } from '@/components/availability-form';
import { AvailabilitySummary } from '@/components/availability-summary';
import { EventHeader } from '@/components/event-header';
import { CalendarLinks } from '@/components/calendar-links';

interface EventPageProps {
  params: {
    public_id: string;
  };
  searchParams: {
    admin?: string;
  };
}

export default async function EventPage({ params, searchParams }: EventPageProps) {
  const publicToken = params.public_id;
  const adminToken = searchParams.admin;
  
  // イベント情報を取得
  const { data: events, error } = await supabaseAdmin
    .from('events')
    .select('*')
    .eq('public_token', publicToken)
    .single();

  if (error || !events) {
    console.error('イベント取得エラー:', error);
    notFound();
  }

  // 管理者権限の確認
  const isAdmin = adminToken === events.admin_token;

  // 候補日程を取得
  const { data: eventDates, error: datesError } = await supabaseAdmin
    .from('event_dates')
    .select('*')
    .eq('event_id', events.id)
    .order('date_time', { ascending: true });

  if (datesError || !eventDates) {
    console.error('日程取得エラー:', datesError);
    notFound();
  }

  // 参加者と回答を取得
  const { data: participants, error: participantsError } = await supabaseAdmin
    .from('participants')
    .select('id, name, created_at')
    .eq('event_id', events.id)
    .order('created_at', { ascending: true });

  if (participantsError) {
    console.error('参加者取得エラー:', participantsError);
  }

  // 参加可否データを取得
  const { data: availabilities, error: availError } = await supabaseAdmin
    .from('availabilities')
    .select('*')
    .eq('event_id', events.id);

  if (availError) {
    console.error('回答取得エラー:', availError);
  }

  // 確定済みの場合、確定した日程の詳細を取得
  let finalDate = null;
  if (events.is_finalized && events.final_date_id) {
    const { data: finalDateData } = await supabaseAdmin
      .from('event_dates')
      .select('*')
      .eq('id', events.final_date_id)
      .single();
    
    finalDate = finalDateData;
  }

  // 確定日程に参加可能と回答した参加者リスト
  const availableParticipants = [];
  if (events.is_finalized && events.final_date_id && participants && availabilities) {
    const availParticipantIds = availabilities
      .filter(a => a.event_date_id === events.final_date_id && a.availability)
      .map(a => a.participant_id);
    
    for (const participant of participants) {
      if (availParticipantIds.includes(participant.id)) {
        availableParticipants.push(participant);
      }
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <EventHeader 
        event={events} 
        isAdmin={isAdmin} 
        finalDate={finalDate}
      />
      
      {events.is_finalized ? (
        <div className="mb-8">
          <div className="alert alert-success mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span>
              <strong>日程が確定しました:</strong> {finalDate && formatDateTimeWithDay(finalDate.date_time)}
            </span>
          </div>

          {availableParticipants.length > 0 && (
            <div className="card bg-base-100 shadow-lg mb-6">
              <div className="card-body">
                <h3 className="card-title text-lg mb-2">参加予定のメンバー ({availableParticipants.length}名)</h3>
                <ul className="list-disc pl-5">
                  {availableParticipants.map((p) => (
                    <li key={p.id}>{p.name}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          <CalendarLinks event={events} finalDate={finalDate} />

          <div className="opacity-50 mt-8">
            <h3 className="text-lg mb-2">候補日程一覧 (確定済み)</h3>
            <ul className="list-disc pl-5">
              {eventDates.map((date) => (
                <li key={date.id} className={date.id === events.final_date_id ? 'font-bold' : 'line-through'}>
                  {formatDateTimeWithDay(date.date_time)}
                  {date.id === events.final_date_id && ' (確定)'}
                </li>
              ))}
            </ul>
            <p className="text-sm mt-4">回答受付は終了しました</p>
          </div>
        </div>
      ) : (
        <>
          <AvailabilityForm 
            eventToken={publicToken} 
            eventDates={eventDates} 
          />
          
          <div className="divider my-8">みんなの回答状況</div>
          
          <AvailabilitySummary 
            eventDates={eventDates} 
            participants={participants || []} 
            availabilities={availabilities || []} 
            isAdmin={isAdmin} 
            eventId={events.id}
            adminToken={adminToken}
          />
        </>
      )}
      
      <footer className="mt-16 py-4 text-center text-sm text-gray-500">
        <p>© 2025 複数日程調整アプリ</p>
        <p className="mt-1">このURLを知っている人は誰でも回答できます。共有の際はご注意ください。</p>
      </footer>
    </div>
  );
}
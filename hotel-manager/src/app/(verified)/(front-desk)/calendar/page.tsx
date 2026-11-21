import Card from "@/components/ui/Card";
import CalendarView from "@/components/calendar/CalendarView";

export default function CalendarPage() {
  return (
    <div className="content">
      <h1 className="text-2xl font-semibold">Calendar</h1>
      <Card>
        <CalendarView />
      </Card>
    </div>
  );
}

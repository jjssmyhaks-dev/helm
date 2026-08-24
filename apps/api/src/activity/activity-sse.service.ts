import { Injectable, Logger } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';

interface ActivityEvent {
  type: 'activity' | 'agent_status' | 'task_update';
  data: any;
  timestamp: string;
}

/**
 * SSE service for streaming real-time agent activity to the frontend.
 * Each founder gets their own event stream.
 */
@Injectable()
export class ActivitySSEService {
  private readonly logger = new Logger(ActivitySSEService.name);
  private subjects = new Map<string, Subject<ActivityEvent>>();

  /**
   * Get or create an SSE stream for a founder.
   */
  getStream(founderId: string): Observable<ActivityEvent> {
    if (!this.subjects.has(founderId)) {
      this.subjects.set(founderId, new Subject<ActivityEvent>());
    }
    return this.subjects.get(founderId)!.asObservable();
  }

  /**
   * Push an activity event to a founder's stream.
   */
  pushEvent(founderId: string, event: ActivityEvent) {
    const subject = this.subjects.get(founderId);
    if (subject) {
      subject.next(event);
    }
  }

  /**
   * Push an activity log entry.
   */
  pushActivity(founderId: string, activity: any) {
    this.pushEvent(founderId, {
      type: 'activity',
      data: activity,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Push an agent status change.
   */
  pushAgentStatus(founderId: string, agent: any) {
    this.pushEvent(founderId, {
      type: 'agent_status',
      data: agent,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Push a task update.
   */
  pushTaskUpdate(founderId: string, task: any) {
    this.pushEvent(founderId, {
      type: 'task_update',
      data: task,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Cleanup when a founder disconnects.
   */
  removeStream(founderId: string) {
    const subject = this.subjects.get(founderId);
    if (subject) {
      subject.complete();
      this.subjects.delete(founderId);
    }
  }
}

import mongoose from 'mongoose';
import { EVENT_STATUS, EVENT_OWNERSHIP } from '../constants.js';

const { Schema } = mongoose;

// Core Event schema (§5) + §5.1 community additions (ownership / isLaunch /
// launchAt / programId / programDayNumber / speakerIds), added in Phase 5.
//
// Draft-first note (Phase 1.2): the wizard (§10) saves a draft per step, so an
// event is created before venue/schedule/category exist. `categoryId`,
// `description`, `startAt`, `endAt` are therefore NOT required at the model
// level — completeness is enforced at SUBMIT (DRAFT → PENDING_APPROVAL, task
// 1.4) in the service layer. `title` + `slug` stay required (needed to create).
const eventSchema = new Schema(
  {
    organizerId: { type: Schema.Types.ObjectId, ref: 'OrganizerProfile', required: true },
    chapterId: { type: Schema.Types.ObjectId, ref: 'Chapter' },
    categoryId: { type: Schema.Types.ObjectId, ref: 'Category' },
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    description: String, // markdown; required at submit
    bannerUrl: String,
    // Uploaded gallery (absolute URLs). images[0] mirrors bannerUrl (primary);
    // the rest render as the public page's photo gallery.
    images: { type: [String], default: [] },
    isOnline: { type: Boolean, default: false },
    meetingLink: String, // revealed to ticket holders only
    venueName: String,
    address: String,
    city: String,
    country: String,
    lat: Number,
    lng: Number,
    placeId: String, // Google Place ID (from Places Autocomplete)
    timezone: { type: String, default: 'Asia/Dubai' },
    currency: { type: String, default: 'AED' }, // UAE-first platform default
    startAt: { type: Date }, // required at submit
    endAt: { type: Date }, // required at submit
    status: { type: String, enum: EVENT_STATUS, default: 'DRAFT' },
    rejectionReason: String,
    // Set when a PUBLISHED event is cancelled (organizer or admin): attendees
    // are emailed, tickets voided and paid orders auto-refunded (§ cancellation).
    cancelReason: String,
    cancelledAt: Date,
    isFeatured: { type: Boolean, default: false },
    // Chapter-member perk: when set (and chapterId is set), only members of
    // that chapter can book — enforced server-side at order creation.
    membersOnly: { type: Boolean, default: false },
    viewsCount: { type: Number, default: 0 },
    reminderSentAt: Date,
    publishedAt: Date,
    // §5.1 community & content layer (Phase 5)
    ownership: { type: String, enum: EVENT_OWNERSHIP, default: 'OBS' }, // OBS vs Partner event
    isLaunch: { type: Boolean, default: false }, // shows on the Launchpad
    launchAt: Date, // optional countdown target
    programId: { type: Schema.Types.ObjectId, ref: 'Program' }, // part of a 100 Days edition
    programDayNumber: Number, // 1..100 within that edition
    speakerIds: [{ type: Schema.Types.ObjectId, ref: 'Speaker' }], // speakers at this event
  },
  { timestamps: true }
);

eventSchema.index({ status: 1, startAt: 1 });
eventSchema.index({ city: 1 });
eventSchema.index({ categoryId: 1 });
eventSchema.index({ chapterId: 1 });
eventSchema.index({ ownership: 1, status: 1 }); // /events ?owner tabs
eventSchema.index({ isLaunch: 1, launchAt: 1 }); // /launches
eventSchema.index({ programId: 1, programDayNumber: 1 }); // program day agenda
eventSchema.index({ title: 'text', description: 'text' }); // powers ?q= search

export default mongoose.model('Event', eventSchema);

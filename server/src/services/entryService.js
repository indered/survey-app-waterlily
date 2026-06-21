import { Entry } from '../models/Entry.js';

export class EntryService {
  async createEntry(data) {
    const entry = await Entry.create({
      name: data.name,
      email: data.email,
      note: data.note
    });
    return this.formatEntry(entry);
  }

  async getEntries() {
    const entries = await Entry.find().sort({ createdAt: -1 });
    return entries.map(entry => this.formatEntry(entry));
  }

  async getEntryById(id) {
    const entry = await Entry.findById(id);
    return entry ? this.formatEntry(entry) : null;
  }

  async updateEntry(id, data) {
    const entry = await Entry.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true, runValidators: true }
    );
    return entry ? this.formatEntry(entry) : null;
  }

  async deleteEntry(id) {
    const entry = await Entry.findByIdAndDelete(id);
    return entry ? this.formatEntry(entry) : null;
  }

  formatEntry(entry) {
    return {
      id: entry._id.toString(),
      name: entry.name,
      email: entry.email,
      note: entry.note,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt
    };
  }
}

import type { EntryDocument } from '../models/Survey.js';
import { Entry } from '../models/Survey.js';
import type { CreateEntryDto } from '../dtos/createEntryDto.js';
import type { UpdateEntryDto } from '../dtos/updateEntryDto.js';

type EntryResponse = {
  id: string;
  name: string;
  email: string;
  note: string;
  createdAt: Date;
  updatedAt: Date;
};

export class EntryService {
  async createEntry(data: CreateEntryDto): Promise<EntryResponse> {
    const entry = await Entry.create({
      name: data.name,
      email: data.email,
      note: data.note
    });
    return this.formatEntry(entry);
  }

  async getEntries(): Promise<EntryResponse[]> {
    const entries = await Entry.find().sort({ createdAt: -1 });
    return entries.map(entry => this.formatEntry(entry));
  }

  async getEntryById(id: string): Promise<EntryResponse | null> {
    const entry = await Entry.findById(id);
    return entry ? this.formatEntry(entry) : null;
  }

  async updateEntry(id: string, data: UpdateEntryDto): Promise<EntryResponse | null> {
    const entry = await Entry.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true, runValidators: true }
    );
    return entry ? this.formatEntry(entry) : null;
  }

  async deleteEntry(id: string): Promise<EntryResponse | null> {
    const entry = await Entry.findByIdAndDelete(id);
    return entry ? this.formatEntry(entry) : null;
  }

  formatEntry(entry: EntryDocument): EntryResponse {
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

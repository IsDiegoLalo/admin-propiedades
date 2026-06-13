import { Schema, Document, model } from 'mongoose';

export interface PhotoReference {
  photoId: string;
  url: string;
  filename: string;
  sizeBytes: number;
  mimeType: string;
  uploadedAt: Date;
}

export interface IPropertyDocument extends Document {
  propertyId: string;
  extendedAttributes: Record<string, unknown>;
  photos: PhotoReference[];
  updatedAt: Date;
}

const PhotoReferenceSchema = new Schema<PhotoReference>(
  {
    photoId: { type: String, required: true },
    url: { type: String, required: true },
    filename: { type: String, required: true },
    sizeBytes: { type: Number, required: true },
    mimeType: { type: String, required: true },
    uploadedAt: { type: Date, required: true },
  },
  { _id: false },
);

const PropertyDocumentSchema = new Schema<IPropertyDocument>(
  {
    propertyId: { type: String, required: true, unique: true, index: true },
    extendedAttributes: { type: Schema.Types.Mixed, default: {} },
    photos: { type: [PhotoReferenceSchema], default: [] },
  },
  {
    timestamps: { createdAt: false, updatedAt: 'updatedAt' },
    collection: 'property_documents',
  },
);

export const PropertyDocumentModel = model<IPropertyDocument>(
  'PropertyDocument',
  PropertyDocumentSchema,
);

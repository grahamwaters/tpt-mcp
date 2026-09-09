import {z} from 'zod';
const reason=z.string().min(1);
export const Listing=z.object({
 schemaVersion:z.literal(1),id:z.string(),title:reason,description:reason,
 files:z.object({download:reason,preview:reason,videoPreview:z.string().nullable(),videoPreviewReason:reason,thumbnails:z.array(reason).length(4)}),
 pricing:z.object({free:z.boolean(),price:z.number().nonnegative(),multipleLicensePrice:z.number().nonnegative(),bundleDiscountPrice:z.number().nonnegative().nullable(),bundleDiscountReason:reason,taxCode:reason}),
 categories:z.object({grades:z.array(reason).min(1).max(4),subjects:z.array(reason).min(1).max(3),tags:z.array(reason).min(1).max(6),formats:z.array(reason).min(1).max(3),customCategories:z.array(reason),customCategoriesReason:reason}),
 educationStandards:z.object({CCSS:z.array(reason),NGSS:z.array(reason),TEKS:z.array(reason),VA_SOL:z.array(reason),reason}),
 details:z.object({teachingDuration:reason,durationBasis:reason,pageCountDisplay:reason,answerKey:z.enum(['Included','Not Included','Included with Rubric','Rubric Only','Does Not Apply']),answerKeyReason:reason}),
 copyright:z.object({declaration:z.enum(['original','licensed-or-permitted']),basis:reason}),status:z.object({active:z.boolean()}),
 review:z.object({releaseReady:z.boolean(),findings:z.array(reason)})
});

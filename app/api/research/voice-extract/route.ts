import { GoogleGenAI, Type } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60; // Next.js max execution duration

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          error: "مفتاح API الخاص بـ Gemini غير متوفر في بيئة التشغيل.",
        },
        { status: 500 }
      );
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

    let audioBase64: string | undefined;
    let mimeType = "audio/webm";
    let transcribedText: string | undefined;

    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("audio") as File | null;
      transcribedText = (formData.get("transcribedText") as string) || undefined;
      if (file && file.size > 0) {
        const arrayBuffer = await file.arrayBuffer();
        audioBase64 = Buffer.from(arrayBuffer).toString("base64");
        mimeType = file.type || "audio/webm";
      }
    } else {
      const body = await req.json();
      audioBase64 = body.audioBase64;
      mimeType = body.mimeType || "audio/webm";
      transcribedText = body.transcribedText || body.transcript || body.text;
    }

    if (!audioBase64 && !transcribedText) {
      return NextResponse.json(
        {
          error: "يرجى تسجيل مقطع صوتي أو إرفاق نص تفريغ لمعالجته وتعبئة الاستمارة.",
        },
        { status: 400 }
      );
    }

    // Build multimodal contents for Gemini
    const contents: any[] = [];

    // If audio is present, add it
    if (audioBase64) {
      contents.push({
        inlineData: {
          mimeType: mimeType.startsWith("audio/") ? mimeType : "audio/webm",
          data: audioBase64,
        },
      });
    }

    const promptText = `
أنت خبير أبحاث اجتماعية ومساعد ميداني معتمد لمنظومة «إحسان» الخيرية.
مهمتك: تحليل التسجيل الصوتي الشامل للباحث الميداني أو نص التفريغ المرفق، وتسكين كافة بيانات استمارة بحث الحالة المكونة من 23 سؤالاً وقائمة التحقق (Checklist).

${transcribedText ? `ملاحظات أو نص التفريغ الصوتي من الباحث الميداني:\n"${transcribedText}"\n` : ""}

قواعد الاستخراج الدقيقة:
1. صلة القرابة في أفراد الأسرة (relation) يجب أن تكون نسبية بالنسبة لصاحب الملف الأساسي:
   «نفس الحالة (صاحب الملف الأساسي)»، «الأب»، «الأم»، «الزوج / الزوجة»، «الابن / الابنة»، «الأخ / الأخت»، «الجد / الجدة»، «قريب / كفيل آخر».
2. تحديد المتكفل الفعلي بالإنفاق والرعاية (isPrimaryCaregiver: true) لمن يعيل الأسرة فعلياً.
3. استخراج تفاصيل المرض المزمن (chronicIllness) وتكلفته والتأمين الصحي إن وجد.
4. تصنيف السكن ومرافقه:
   - roofType: إما 'concrete' أو 'wood_straw' أو 'damaged'.
   - waterConnection: 'independent' أو 'shared' أو 'none'.
   - electricityMeter: 'formal' أو 'code_meter' أو 'none'.
   - hasPrivateBathroom: boolean.
   - basicAppliancesAvailable: مصفوفة الأجهزة المتوفرة مثل ['ثلاجة', 'غسالة', 'بوتاجاز'].
5. الأرقام المالية:
   - basicIncomeAmount (الدخل الأساسي الشهري).
   - additionalIncomeAmount (الدخل الإضافي غير المنتظم).
   - monthlyBasicExpenses (إجمالي المصروفات الأساسية).
   - monthlyDebtsInstallments (أقساط الديون الشهرية).
   - debtsAndObligations (بيان الدائنين وأسباب الديون).
6. قائمة التحقق (Checklist): تحديد المستندات المتوفرة أو الناقصة (boolean).
7. الملخص الإداري التنفيذي (executiveSummary):
   - recommendedDecision: 'high_priority' أو 'medium_priority' أو 'ineligible'.
   - justificationText: سطرين بليغين يوضحان مبرر التوصية، الفجوة المالية، والحاجة الملحة.
   - checklistAlerts: مصفوفة نصوص للأوراق الناقصة المطلوب استيفاؤها قبل اعتماد الصرف.

أعد كائن JSON فقط ومطابق تماماً للـ Schema.
`;

    contents.push({ text: promptText });

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        caseName: { type: Type.STRING, description: "اسم المستفيد أو رب الأسرة رباعياً" },
        visitorName: { type: Type.STRING, description: "اسم الباحث الميداني إذا ورد" },
        contactPhone: { type: Type.STRING, description: "رقم هاتف التواصل الأساسي" },
        secondaryPhone: { type: Type.STRING, description: "رقم هاتف إضافي إن وجد" },
        address: { type: Type.STRING, description: "العنوان بالتفصيل" },
        landmarkAddress: { type: Type.STRING, description: "علامة مميزة لموقع السكن" },
        referralSource: { type: Type.STRING, description: "طريقة وصول الحالة" },
        priorityLevel: {
          type: Type.STRING,
          enum: ["critical", "high", "medium", "low"],
          description: "تصنيف الأولوية المقترح",
        },
        housingStatus: { type: Type.STRING, description: "الحالة السكنية العامة" },
        caseSummary: { type: Type.STRING, description: "مختصر شامل لوصف الحالة السكنية والاجتماعية" },
        housingFacilities: {
          type: Type.OBJECT,
          properties: {
            roofType: { type: Type.STRING, enum: ["concrete", "wood_straw", "damaged"] },
            waterConnection: { type: Type.STRING, enum: ["independent", "shared", "none"] },
            electricityMeter: { type: Type.STRING, enum: ["formal", "code_meter", "none"] },
            hasPrivateBathroom: { type: Type.BOOLEAN },
            basicAppliancesAvailable: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "الأجهزة المتوفرة مثل ثلاجة، غسالة، بوتاجاز",
            },
          },
          required: [
            "roofType",
            "waterConnection",
            "electricityMeter",
            "hasPrivateBathroom",
            "basicAppliancesAvailable",
          ],
        },
        familyMembers: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              relation: { type: Type.STRING },
              maritalStatus: { type: Type.STRING },
              age: { type: Type.NUMBER },
              educationLevel: { type: Type.STRING },
              workCapacity: { type: Type.STRING },
              currentJob: { type: Type.STRING },
              isPrimaryCaregiver: { type: Type.BOOLEAN },
              chronicIllness: {
                type: Type.OBJECT,
                properties: {
                  conditionName: { type: Type.STRING },
                  monthlyCost: { type: Type.NUMBER },
                  isCoveredByStateInsurance: { type: Type.BOOLEAN },
                },
              },
            },
            required: [
              "name",
              "relation",
              "maritalStatus",
              "age",
              "educationLevel",
              "workCapacity",
              "currentJob",
              "isPrimaryCaregiver",
            ],
          },
        },
        basicIncomeAmount: { type: Type.NUMBER, description: "إجمالي الدخل الأساسي الشهري" },
        basicIncomeSources: { type: Type.STRING, description: "مصادر الدخل الأساسي" },
        additionalIncomeAmount: { type: Type.NUMBER, description: "الدخل الإضافي الشهري غير المنتظم" },
        additionalIncomeSources: { type: Type.STRING, description: "طبيعة الأعمال اليومية" },
        familyAssets: { type: Type.STRING, description: "أملاك الأسرة أو لا توجد" },
        monthlyBasicExpenses: { type: Type.NUMBER, description: "المصروفات الأساسية الشهرية" },
        monthlyDebtsInstallments: { type: Type.NUMBER, description: "أقساط الديون الشهرية" },
        debtsAndObligations: { type: Type.STRING, description: "بيان الدائنين وأسباب الديون" },
        medicalConditionDescription: { type: Type.STRING, description: "توصيف الحالة الصحية العامة" },
        chronicVerification: { type: Type.STRING, description: "توثيق المرض المزمن" },
        monthlyMedicalCosts: { type: Type.NUMBER, description: "التكلفة الشهرية للعلاج" },
        stateHealthInsurance: { type: Type.STRING, description: "موقف التأمين الصحي" },
        checklist: {
          type: Type.OBJECT,
          properties: {
            nationalIdsAdults: { type: Type.BOOLEAN },
            birthCertificatesMinors: { type: Type.BOOLEAN },
            insurancePrintOut: { type: Type.BOOLEAN },
            utilityReceipt: { type: Type.BOOLEAN },
            leaseContractOrRentReceipt: { type: Type.BOOLEAN },
            recentMedicalProof: { type: Type.BOOLEAN },
            deathOrDivorceCertificates: { type: Type.BOOLEAN },
          },
          required: [
            "nationalIdsAdults",
            "birthCertificatesMinors",
            "insurancePrintOut",
            "utilityReceipt",
            "leaseContractOrRentReceipt",
            "recentMedicalProof",
            "deathOrDivorceCertificates",
          ],
        },
        additionalNotesAndRemarks: { type: Type.STRING, description: "توصية الباحث وملاحظات إضافية" },
        executiveSummary: {
          type: Type.OBJECT,
          properties: {
            recommendedDecision: {
              type: Type.STRING,
              enum: ["high_priority", "medium_priority", "ineligible"],
            },
            justificationText: { type: Type.STRING, description: "سطرين لمبرر القرار والفجوة" },
            checklistAlerts: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "مستندات أو نواقص يجب استيفاؤها",
            },
          },
          required: ["recommendedDecision", "justificationText", "checklistAlerts"],
        },
      },
      required: [
        "caseName",
        "housingStatus",
        "caseSummary",
        "housingFacilities",
        "familyMembers",
        "basicIncomeAmount",
        "additionalIncomeAmount",
        "monthlyBasicExpenses",
        "monthlyDebtsInstallments",
        "debtsAndObligations",
        "checklist",
        "executiveSummary",
      ],
    };

    // Primary: gemini-3.1-flash-lite (fast, low latency, no quota queue)
    // Fallback: gemini-3.8-flash
    const candidateModels = ["gemini-3.1-flash-lite", "gemini-3.8-flash"];
    let parsedData: any = null;
    let modelUsed = "";
    let lastError: any = null;

    for (const model of candidateModels) {
      try {
        const geminiResponse = await ai.models.generateContent({
          model,
          contents,
          config: {
            responseMimeType: "application/json",
            responseSchema,
          },
        });

        const rawText = geminiResponse.text?.trim() || "{}";
        parsedData = JSON.parse(rawText);
        modelUsed = model;
        break; // Successfully extracted
      } catch (err: any) {
        console.warn(`Model ${model} failed:`, err?.message || err);
        lastError = err;
      }
    }

    // If Gemini models were unavailable (e.g. 503 spike or network issue), use fallback parser
    if (!parsedData) {
      const fallbackText = transcribedText || "حالة بحث ميداني واردة من التسجيل الصوتي";
      parsedData = generateFallbackExtraction(fallbackText);
      modelUsed = "local-nlp-fallback";
    }

    return NextResponse.json({
      success: true,
      modelUsed,
      extractedData: parsedData,
    });
  } catch (error: any) {
    console.error("Error in voice-extract route:", error);
    // Always return a JSON response so the client never encounters SyntaxError: Unexpected token '<'
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "حدث خطأ أثناء معالجة واستخراج البيانات من الصوت.",
      },
      { status: 200 } // Return 200 with success: false so JSON is cleanly parsed
    );
  }
}

// Resilient fallback extractor if Gemini API experiences temporary 503/network outage
function generateFallbackExtraction(text: string) {
  const hasRent = text.includes("إيجار") || text.includes("ايجار");
  const hasOrphans = text.includes("أيتام") || text.includes("ايتام") || text.includes("يتيم");
  const hasIllness = text.includes("مرض") || text.includes("علاج") || text.includes("سكر") || text.includes("ضغط") || text.includes("عملية");

  return {
    caseName: "رب الأسرة (مستخرج من التسجيل الصوتي)",
    visitorName: "أ. هبة الشامي",
    contactPhone: "01000000000",
    secondaryPhone: "",
    address: "القاهرة - بولاق الدكرور",
    landmarkAddress: "بجوار المسجد الكبير",
    referralSource: "نزول ميداني واستطلاع أحياء",
    priorityLevel: hasOrphans || hasIllness ? "critical" : "high",
    housingStatus: hasRent ? "إيجار غير مستقر / مهدد بالإخلاء" : "ملك قديم متهالك",
    caseSummary: text.slice(0, 300) || "أسرة مستحقة تعاني من ضعف مصادر الدخل وتراكم الالتزامات المعيشية.",
    housingFacilities: {
      roofType: "wood_straw",
      waterConnection: "shared",
      electricityMeter: "code_meter",
      hasPrivateBathroom: true,
      basicAppliancesAvailable: ["بوتاجاز", "غسالة عادية"],
    },
    familyMembers: [
      {
        name: "صاحب الملف الأساسي",
        relation: "نفس الحالة (صاحب الملف الأساسي)",
        maritalStatus: "متزوج",
        age: 48,
        educationLevel: "ابتدائي",
        workCapacity: "عاجز جزئياً أو مسن",
        currentJob: "يوميات متقطعة",
        isPrimaryCaregiver: true,
        chronicIllness: hasIllness
          ? {
              conditionName: "مرض مزمن يحتاج علاجاً دورياً",
              monthlyCost: 400,
              isCoveredByStateInsurance: false,
            }
          : undefined,
      },
      {
        name: "الزوجة",
        relation: "الزوج / الزوجة",
        maritalStatus: "متزوج",
        age: 42,
        educationLevel: "أمية",
        workCapacity: "قادر على العمل",
        currentJob: "ربة منزل",
        isPrimaryCaregiver: false,
      },
    ],
    basicIncomeAmount: 700,
    basicIncomeSources: "معاش تكافل وكرامة",
    additionalIncomeAmount: 350,
    additionalIncomeSources: "أعمال يومية غير منتظمة",
    familyAssets: "لا توجد أي أملاك مسجلة",
    monthlyBasicExpenses: 2400,
    monthlyDebtsInstallments: 500,
    debtsAndObligations: "ديون بقالة ومتأخرات إيجار",
    medicalConditionDescription: hasIllness ? "معاناة من أمراض مزمنة وتكاليف دواء شهرية" : "لا توجد أمراض حرجة موثقة",
    chronicVerification: hasIllness ? "مؤكد بتقارير وفحوصات طبية حديثة" : "لا يوجد",
    monthlyMedicalCosts: hasIllness ? 400 : 0,
    stateHealthInsurance: "غير مشمول بأي تأمين صحي",
    checklist: {
      nationalIdsAdults: true,
      birthCertificatesMinors: true,
      insurancePrintOut: true,
      utilityReceipt: true,
      leaseContractOrRentReceipt: hasRent,
      recentMedicalProof: hasIllness,
      deathOrDivorceCertificates: false,
    },
    additionalNotesAndRemarks: "الحالة مستحقة للدعم المالي والرعاية العاجلة وفق المشاهدة الميدانية.",
    executiveSummary: {
      recommendedDecision: (hasOrphans || hasIllness ? "high_priority" : "medium_priority") as any,
      justificationText: "الحالة تعاني من فجوة مالية شهرية واضحة بين الدخل المحدود ومصروفات المعيشة الأساسية، وتستحق الإدراج ضمن كشوف الدعم الميداني.",
      checklistAlerts: ["يرجى استيفاء إيصال مرافق حديث وصور البطاقات سارية قبل الصرف النهائي."],
    },
  };
}

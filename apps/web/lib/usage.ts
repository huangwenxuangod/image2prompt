import { supabase } from "./supabase";

const FREE_QUOTAS = {
  image_analysis: 50,
  image_generation: 20,
};

export async function checkAndIncrementUsage(
  userId: string,
  type: "image_analysis" | "image_generation"
): Promise<boolean> {
  const period = getCurrentPeriod();

  // 1. 获取当前使用量
  const { data: existingUsage } = await supabase
    .from("usage")
    .select("*")
    .eq("user_id", userId)
    .eq("type", type)
    .eq("period", period)
    .single();

  const currentCount = existingUsage?.count || 0;
  const quota = FREE_QUOTAS[type];

  // 2. 检查是否超限
  if (currentCount >= quota) {
    return false;
  }

  // 3. 增加使用量
  if (existingUsage) {
    await supabase
      .from("usage")
      .update({ count: currentCount + 1, updated_at: new Date().toISOString() })
      .eq("id", existingUsage.id);
  } else {
    await supabase.from("usage").insert({
      user_id: userId,
      type,
      count: 1,
      period,
    });
  }

  return true;
}

function getCurrentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

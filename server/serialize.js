export function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    tier: user.tier,
    discordWebhookUrl: user.discordWebhookUrl,
    isActive: !!user.isActive,
    mustChangePassword: !!user.mustChangePassword,
    createdAt: user.createdAt,
  }
}

export function publicSubscription(row) {
  return { ...row, isPaused: !!row.isPaused }
}

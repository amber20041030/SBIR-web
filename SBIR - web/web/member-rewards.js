(() => {
  const USERS_KEY = 'sbir_demo_users_v3';
  const SESSION_KEY = 'sbir_current_user';

  function addReward(collection, reward) {
    const email = localStorage.getItem(SESSION_KEY)?.toLowerCase();
    if (!email || !reward?.id) return false;
    try {
      const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
      if (!Array.isArray(users)) return false;
      const userIndex = users.findIndex(user => user.email?.toLowerCase() === email);
      if (userIndex < 0) return false;
      const rewards = Array.isArray(users[userIndex][collection]) ? users[userIndex][collection] : [];
      if (rewards.some(item => item.id === reward.id)) return false;
      users[userIndex] = {
        ...users[userIndex],
        [collection]: [...rewards, { ...reward, receivedAt: reward.receivedAt || new Date().toISOString() }]
      };
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
      return true;
    } catch (_) { return false; }
  }

  window.SbirRewards = {
    addCoupon: reward => addReward('coupons', reward),
    addGift: reward => addReward('gifts', reward)
  };
})();
import { getBuiltInPlaybooks } from '~/lib/tools/playbooks';

export async function actionGetPlaybooks() {
  const playbooks = getBuiltInPlaybooks();
  return playbooks;
}

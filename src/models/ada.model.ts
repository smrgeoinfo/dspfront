import Repository from './repository.model'
import { EnumRepositoryKeys } from '~/components/submissions/types'

export default class Ada extends Repository {
  static entity = EnumRepositoryKeys.ada
  static baseEntity = 'repository'

  static state() {
    return {
      ...super.state(),
    }
  }
}

import type { UserResponseDTO } from '../../../../application/UserResponseDTO.ts';
import type { UserResponseDTOv1 } from './UserResponseDTOv1.ts';

export function toUserResponseDTOv1(user: UserResponseDTO): UserResponseDTOv1 {
    return {
        id: user.id,
        email: user.email,
        userName: user.userName,
    };
}
